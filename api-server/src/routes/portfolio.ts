import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, portfolioSnapshotsTable, portfolioAssetsTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { createViemClient, ERC20_ABI } from "../lib/viem-client";
import { writeAuditLog } from "../lib/audit-helper";
import { parseAbiItem } from "viem";
import type { Address } from "viem";
import type { Request, Response } from "express";

// ── Price feed (CoinGecko free API, no key required) ─────────────────────────

const CHAIN_TO_CG_PLATFORM: Record<number, string> = {
  1: "ethereum",
  8453: "base",
  10: "optimistic-ethereum",
  42161: "arbitrum-one",
  137: "polygon-pos",
  11155111: "ethereum",
  // Robinhood Chain (4663) has no CoinGecko platform — fall back to native price only
};

const NATIVE_CG_ID: Record<number, string> = {
  1: "ethereum", 8453: "ethereum", 10: "ethereum",
  42161: "ethereum", 4663: "ethereum", 11155111: "ethereum",
  137: "matic-network",
};

interface PriceResult {
  native: number | null;
  tokens: Record<string, number>; // lowercased address → USD price
}

async function fetchCoinGeckoPrices(
  chainId: number,
  tokenAddresses: string[],
): Promise<PriceResult> {
  const result: PriceResult = { native: null, tokens: {} };
  const CG = "https://api.coingecko.com/api/v3";
  const headers = { Accept: "application/json" };

  // Native token price
  try {
    const nativeId = NATIVE_CG_ID[chainId] ?? "ethereum";
    const r = await fetch(`${CG}/simple/price?ids=${nativeId}&vs_currencies=usd`, {
      headers, signal: AbortSignal.timeout(6000),
    });
    if (r.ok) {
      const d = await r.json() as Record<string, { usd?: number }>;
      result.native = d[nativeId]?.usd ?? null;
    }
  } catch { /* ignore — leave null */ }

  // ERC-20 token prices (only chains CoinGecko knows)
  const platform = CHAIN_TO_CG_PLATFORM[chainId];
  if (platform && tokenAddresses.length > 0) {
    try {
      const addrs = tokenAddresses.map(a => a.toLowerCase()).join(",");
      const r = await fetch(
        `${CG}/simple/token_price/${platform}?contract_addresses=${addrs}&vs_currencies=usd`,
        { headers, signal: AbortSignal.timeout(8000) },
      );
      if (r.ok) {
        const d = await r.json() as Record<string, { usd?: number }>;
        for (const [addr, data] of Object.entries(d)) {
          if (data.usd != null) result.tokens[addr.toLowerCase()] = data.usd;
        }
      }
    } catch { /* ignore */ }
  }

  return result;
}

function calcUsdValue(
  balanceRaw: bigint,
  decimals: number,
  priceUsd: number | null,
): string | null {
  if (priceUsd == null || priceUsd <= 0) return null;
  const divisor = 10 ** decimals;
  const balance = Number(balanceRaw) / divisor;
  const value = balance * priceUsd;
  return value > 0 ? value.toFixed(2) : null;
}

const router: IRouter = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

function getNativeSymbol(chainId: number): string {
  const map: Record<number, string> = {
    4663: "ETH", 1: "ETH", 8453: "ETH", 10: "ETH", 42161: "ETH",
    137: "POL", 11155111: "ETH",
  };
  return map[chainId] ?? "ETH";
}

function formatBalance(raw: bigint, decimals: number): string {
  if (decimals === 0) return raw.toString();
  const divisor = 10n ** BigInt(decimals);
  const whole = raw / divisor;
  const frac = raw % divisor;
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, 6).replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : `${whole}`;
}

function formatSnapshot(
  snap: typeof portfolioSnapshotsTable.$inferSelect,
  assets: (typeof portfolioAssetsTable.$inferSelect)[],
) {
  return {
    id: snap.id,
    walletAddress: snap.walletAddress,
    chainId: snap.chainId,
    analyzedAt: snap.analyzedAt.toISOString(),
    totalUsdValue: snap.totalUsdValue,
    assets: assets.map(a => ({
      tokenAddress: a.tokenAddress,
      tokenSymbol: a.tokenSymbol,
      tokenName: a.tokenName,
      balance: a.balance,
      balanceFormatted: a.balanceFormatted,
      decimals: a.decimals,
      usdValue: a.usdValue,
      isNative: a.isNative === 1,
    })),
  };
}

// ERC-20 Transfer event signature for log scanning
const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

// Most public RPCs cap getLogs at 50k–100k blocks per call.
// We chunk the scan range to stay within limits.
const CHUNK_SIZE = 50_000n;

async function chunkedGetLogs(
  client: ReturnType<typeof createViemClient>,
  event: typeof TRANSFER_EVENT,
  args: { to?: Address; from?: Address },
  fromBlock: bigint,
  toBlock: bigint,
): Promise<{ address: Address }[]> {
  const results: { address: Address }[] = [];
  let start = fromBlock;
  while (start <= toBlock) {
    const end = start + CHUNK_SIZE - 1n < toBlock ? start + CHUNK_SIZE - 1n : toBlock;
    try {
      const logs = await client.getLogs({ event, args, fromBlock: start, toBlock: end });
      for (const log of logs) {
        if (log.address) results.push({ address: log.address.toLowerCase() as Address });
      }
    } catch {
      // If a chunk still fails (e.g. too many results), skip it silently
    }
    start = end + 1n;
  }
  return results;
}

// ── GET /api/portfolio/snapshots ─────────────────────────────────────────────
router.get("/portfolio/snapshots", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const snapshots = await db
    .select()
    .from(portfolioSnapshotsTable)
    .where(eq(portfolioSnapshotsTable.userId, userId))
    .orderBy(desc(portfolioSnapshotsTable.analyzedAt))
    .limit(20);

  const results = await Promise.all(
    snapshots.map(async (snap) => {
      const assets = await db
        .select()
        .from(portfolioAssetsTable)
        .where(eq(portfolioAssetsTable.snapshotId, snap.id));
      return formatSnapshot(snap, assets);
    }),
  );

  res.json(results);
});

// ── POST /api/portfolio/analyze ──────────────────────────────────────────────
//
// Real on-chain portfolio scanner:
//   1. Fetch native (ETH/POL) balance
//   2. Scan Transfer event logs (to + from wallet) to discover ERC-20 tokens
//   3. Read balance, symbol, name, decimals for each discovered contract
//   4. Filter zero-balance tokens — only record tokens currently held
//   5. Persist snapshot + assets to DB
//
router.post("/portfolio/analyze", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const { walletAddress, chainId } = req.body;

  if (!walletAddress || typeof walletAddress !== "string") {
    res.status(400).json({ error: "walletAddress is required" });
    return;
  }
  if (!chainId || typeof chainId !== "number") {
    res.status(400).json({ error: "chainId is required and must be a number" });
    return;
  }

  try {
    const client = createViemClient(chainId);
    const addr = walletAddress.toLowerCase() as Address;

    // ── Step 1: native balance ────────────────────────────────────────────────
    const nativeBalance = await client.getBalance({ address: addr });
    const nativeSymbol  = getNativeSymbol(chainId);
    const nativeFormatted = formatBalance(nativeBalance, 18);

    // ── Step 2: discover ERC-20 tokens via Transfer logs ─────────────────────
    const latestBlock = await client.getBlockNumber();
    const SCAN_RANGE   = 500_000n;
    const fromBlock    = latestBlock > SCAN_RANGE ? latestBlock - SCAN_RANGE : 0n;

    console.log(`[portfolio] analyzing wallet=${addr} chainId=${chainId} blocks=${fromBlock}-${latestBlock} range=${latestBlock-fromBlock}`);

    // Chunked getLogs: scan in 50k-block chunks to stay within RPC limits
    const [receivedLogs, sentLogs] = await Promise.all([
      chunkedGetLogs(client, TRANSFER_EVENT, { to: addr }, fromBlock, latestBlock),
      chunkedGetLogs(client, TRANSFER_EVENT, { from: addr }, fromBlock, latestBlock),
    ]);

    console.log(`[portfolio] receivedLogs: ${receivedLogs.length}, sentLogs: ${sentLogs.length}`);

    // Collect unique contract addresses from both log sets
    const contractAddrs = new Set<Address>();
    for (const log of receivedLogs) contractAddrs.add(log.address);
    for (const log of sentLogs)    contractAddrs.add(log.address);

    console.log(`[portfolio] unique token contracts discovered: ${contractAddrs.size} → ${Array.from(contractAddrs).join(", ")}`);
    console.log(`[portfolio] native balance: ${nativeBalance} wei (${nativeFormatted} ${nativeSymbol})`);

    // ── Step 3: fetch balance + metadata for every discovered token ───────────
    type TokenData = {
      address: Address;
      balance: bigint;
      symbol: string;
      name: string;
      decimals: number;
    };

    const tokenResults = await Promise.allSettled(
      Array.from(contractAddrs).map(async (tokenAddr): Promise<TokenData> => {
        const [balance, symbol, name, decimals] = await Promise.all([
          client.readContract({ address: tokenAddr, abi: ERC20_ABI, functionName: "balanceOf", args: [addr] }) as Promise<bigint>,
          client.readContract({ address: tokenAddr, abi: ERC20_ABI, functionName: "symbol"    }) as Promise<string>,
          client.readContract({ address: tokenAddr, abi: ERC20_ABI, functionName: "name"      }) as Promise<string>,
          client.readContract({ address: tokenAddr, abi: ERC20_ABI, functionName: "decimals"  }) as Promise<number>,
        ]);
        return { address: tokenAddr, balance, symbol, name, decimals };
      }),
    );

    // Keep only tokens with non-zero current balance
    const heldTokens: TokenData[] = tokenResults
      .filter((r): r is PromiseFulfilledResult<TokenData> => r.status === "fulfilled" && r.value.balance > 0n)
      .map(r => r.value);

    // ── Step 4: fetch USD prices from CoinGecko ───────────────────────────────
    const erc20Addresses = heldTokens.map(t => t.address);
    const prices = await fetchCoinGeckoPrices(chainId, erc20Addresses);
    console.log(`[portfolio] prices fetched: native=${prices.native}, tokens=${Object.keys(prices.tokens).length}`);

    const nativeUsdValue  = calcUsdValue(nativeBalance, 18, prices.native);
    const tokenUsdValues  = heldTokens.map(t =>
      calcUsdValue(t.balance, t.decimals, prices.tokens[t.address.toLowerCase()] ?? null),
    );

    // Total portfolio USD value (sum of all non-null values)
    const allValues = [nativeUsdValue, ...tokenUsdValues].filter(Boolean).map(Number);
    const totalUsdValue = allValues.length > 0
      ? allValues.reduce((a, b) => a + b, 0).toFixed(2)
      : null;

    // ── Step 5: persist snapshot ──────────────────────────────────────────────
    const [snapshot] = await db
      .insert(portfolioSnapshotsTable)
      .values({ userId, walletAddress: addr, chainId, totalUsdValue, analyzedAt: new Date() })
      .returning();

    // Native asset
    const [nativeAsset] = await db
      .insert(portfolioAssetsTable)
      .values({
        snapshotId:       snapshot.id,
        tokenAddress:     null,
        tokenSymbol:      nativeSymbol,
        tokenName:        nativeSymbol === "ETH" ? "Ether" : nativeSymbol,
        balance:          nativeBalance.toString(),
        balanceFormatted: nativeFormatted,
        decimals:         18,
        usdValue:         nativeUsdValue,
        isNative:         1,
      })
      .returning();

    // ERC-20 assets
    const erc20Assets = await Promise.all(
      heldTokens.map(async (token, idx) => {
        const [asset] = await db
          .insert(portfolioAssetsTable)
          .values({
            snapshotId:       snapshot.id,
            tokenAddress:     token.address,
            tokenSymbol:      token.symbol,
            tokenName:        token.name,
            balance:          token.balance.toString(),
            balanceFormatted: formatBalance(token.balance, token.decimals),
            decimals:         token.decimals,
            usdValue:         tokenUsdValues[idx] ?? null,
            isNative:         0,
          })
          .returning();
        return asset;
      }),
    );

    void writeAuditLog({
      userId,
      walletAddress: addr,
      eventType: "portfolio_analyzed",
      eventData: {
        chainId,
        assetCount:    1 + erc20Assets.length,
        tokensScanned: contractAddrs.size,
        blocksScanned: Number(latestBlock - fromBlock),
        snapshotId:    snapshot.id,
      },
      status: "success",
    });

    res.json(formatSnapshot(snapshot, [nativeAsset, ...erc20Assets]));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ error: `Portfolio analysis failed: ${message}` });
  }
});

export default router;
