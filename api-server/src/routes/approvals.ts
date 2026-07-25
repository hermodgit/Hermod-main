import { Router, type IRouter } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { createViemClient, ERC20_ABI, MAX_UINT256 } from "../lib/viem-client";
import { writeAuditLog } from "../lib/audit-helper";
import type { Address } from "viem";
import type { Request, Response } from "express";
import { parseAbiItem } from "viem";

const router: IRouter = Router();

// Well-known DEX/protocol spenders (for risk labeling)
const KNOWN_SPENDERS: Record<string, string> = {
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45": "Uniswap v3 Router",
  "0xe592427a0aece92de3edee1f18e0157c05861564": "Uniswap v3 Router (old)",
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": "Uniswap v2 Router",
  "0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f": "SushiSwap Router",
  "0x1111111254fb6c44bac0bed2854e76f90643097d": "1inch v4",
  "0x1111111254eeb25477b68fb85ed929f73a960582": "1inch v5",
  "0xdef1c0ded9bec7f1a1670819833240f027b25eff": "0x v4 Exchange",
  "0x00000000219ab540356cbb839cbe05303d7705fa": "Ethereum 2.0 Deposit",
  "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b": "Compound Comptroller",
  "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9": "Aave v2 LendingPool",
  "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2": "Aave v3 Pool",
};

function getSpenderLabel(address: string): string {
  return KNOWN_SPENDERS[address.toLowerCase()] ?? address;
}

function assessApprovalRisk(allowance: bigint, spenderAddress: string): "low" | "medium" | "high" | "critical" {
  const isUnlimited = allowance === MAX_UINT256;
  const isKnown = !!KNOWN_SPENDERS[spenderAddress.toLowerCase()];

  if (isUnlimited && !isKnown) return "high";
  if (isUnlimited && isKnown) return "medium";
  if (!isKnown) return "medium";
  return "low";
}

// GET /api/approvals
router.get("/approvals", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const { walletAddress, chainId: chainIdStr } = req.query;

  if (!walletAddress || typeof walletAddress !== "string") {
    res.status(400).json({ error: "walletAddress query parameter is required" });
    return;
  }

  const chainId = parseInt(String(chainIdStr ?? "1"), 10);

  try {
    const client = createViemClient(chainId);
    const owner = walletAddress.toLowerCase() as Address;

    // Query last 50000 blocks for Approval events where owner = walletAddress
    const latestBlock = await client.getBlockNumber();
    const fromBlock = latestBlock > 50000n ? latestBlock - 50000n : 0n;

    const approvalEvent = parseAbiItem(
      "event Approval(address indexed owner, address indexed spender, uint256 value)",
    );

    const logs = await client.getLogs({
      event: approvalEvent,
      args: { owner },
      fromBlock,
      toBlock: latestBlock,
    });

    // Group logs by (tokenAddress, spenderAddress) — keep only the latest per pair
    // Since we used event-based getLogs, args are already decoded
    const approvalMap = new Map<string, {
      tokenAddress: string;
      spenderAddress: string;
      value: bigint;
      blockNumber: bigint;
    }>();

    for (const log of logs) {
      if (!log.args.spender) continue;
      const tokenAddress = log.address.toLowerCase();
      const spenderAddress = (log.args.spender as string).toLowerCase();
      const key = `${tokenAddress}:${spenderAddress}`;

      const existing = approvalMap.get(key);
      if (!existing || (log.blockNumber ?? 0n) > existing.blockNumber) {
        approvalMap.set(key, {
          tokenAddress,
          spenderAddress,
          value: (log.args.value as bigint) ?? 0n,
          blockNumber: log.blockNumber ?? 0n,
        });
      }
    }

    // For each unique (token, spender) pair, verify current allowance via contract call
    const approvals = [];
    const tokenMetaCache = new Map<string, { symbol: string; name: string; decimals: number }>();

    for (const [, approval] of approvalMap) {
      // Skip zero allowances (already revoked)
      if (approval.value === 0n) continue;

      try {
        // Verify current on-chain allowance
        const currentAllowance = await client.readContract({
          address: approval.tokenAddress as Address,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [owner, approval.spenderAddress as Address],
        }) as bigint;

        if (currentAllowance === 0n) continue; // Already revoked

        // Get token metadata (cached)
        let meta = tokenMetaCache.get(approval.tokenAddress);
        if (!meta) {
          try {
            const [symbol, decimals] = await Promise.all([
              client.readContract({
                address: approval.tokenAddress as Address,
                abi: ERC20_ABI,
                functionName: "symbol",
              }) as Promise<string>,
              client.readContract({
                address: approval.tokenAddress as Address,
                abi: ERC20_ABI,
                functionName: "decimals",
              }) as Promise<number>,
            ]);
            meta = { symbol, name: symbol, decimals };
          } catch {
            meta = { symbol: "???", name: "Unknown Token", decimals: 18 };
          }
          tokenMetaCache.set(approval.tokenAddress, meta);
        }

        const isUnlimited = currentAllowance === MAX_UINT256;
        const allowanceFormatted = isUnlimited
          ? "UNLIMITED"
          : (Number(currentAllowance) / 10 ** meta.decimals).toFixed(meta.decimals > 6 ? 4 : 2);

        const riskLevel = assessApprovalRisk(currentAllowance, approval.spenderAddress);
        const spenderLabel = getSpenderLabel(approval.spenderAddress);

        approvals.push({
          tokenAddress: approval.tokenAddress,
          tokenSymbol: meta.symbol,
          tokenName: meta.name,
          spenderAddress: approval.spenderAddress,
          spenderLabel,
          allowance: currentAllowance.toString(),
          allowanceFormatted,
          isUnlimited,
          riskLevel,
          chainId,
        });
      } catch {
        // Skip tokens we can't read
      }
    }

    void writeAuditLog({
      userId,
      walletAddress: owner,
      eventType: "approvals_scanned",
      eventData: { chainId, approvalCount: approvals.length, blockRange: `${fromBlock}-${latestBlock}` },
      status: "success",
    });

    res.json(approvals);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({
      error: `Failed to scan approvals: ${message}. Check your RPC configuration.`,
    });
  }
});

// POST /api/approvals/revoke
router.post("/approvals/revoke", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const { tokenAddress, spenderAddress, walletAddress, chainId } = req.body;

  if (!tokenAddress || !spenderAddress || !walletAddress || !chainId) {
    res.status(400).json({
      error: "tokenAddress, spenderAddress, walletAddress, and chainId are required",
    });
    return;
  }

  // Validate addresses
  for (const [name, addr] of [["tokenAddress", tokenAddress], ["spenderAddress", spenderAddress], ["walletAddress", walletAddress]] as const) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
      res.status(400).json({ error: `${name} is not a valid EVM address` });
      return;
    }
  }

  // ERC-20 approve(spender, 0) calldata:
  // Function selector: keccak256("approve(address,uint256)") first 4 bytes = 0x095ea7b3
  const spenderPadded = spenderAddress.toLowerCase().replace("0x", "").padStart(64, "0");
  const amountPadded = "0".padStart(64, "0");
  const calldata = `0x095ea7b3${spenderPadded}${amountPadded}`;

  void writeAuditLog({
    userId,
    walletAddress: walletAddress.toLowerCase(),
    eventType: "approval_revoke_prepared",
    eventData: { tokenAddress, spenderAddress, chainId },
    status: "prepared",
  });

  res.json({
    to: tokenAddress,
    data: calldata,
    value: "0x0",
    chainId,
    estimatedGas: "55000",
    description: `Revoke ${getSpenderLabel(spenderAddress)} approval on ${tokenAddress}`,
    spenderLabel: getSpenderLabel(spenderAddress),
  });
});

export default router;
