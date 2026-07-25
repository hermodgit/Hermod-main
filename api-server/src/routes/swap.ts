import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { createViemClient } from "../lib/viem-client";
import { parseAbi, encodeFunctionData } from "viem";
import type { Address } from "viem";
import type { Request, Response } from "express";

const router: IRouter = Router();

// ── Robinhood Chain on-chain swap infrastructure ──────────────────────────────
const RH_CHAIN_ID = 4663;

// Uniswap V3 contracts on Robinhood Chain (verified on Blockscout)
const UNI_V3_FACTORY   = "0x1F98431c8aD98523631AE4a59f267346ea31F984" as Address;
const SWAP_ROUTER2     = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as Address; // SwapRouter2
const SWAP_ROUTER_V1   = "0xE592427A0AEce92De3Edee1F18E0157C05861564" as Address;
const WETH_RH          = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73" as Address;

// ── Known token registry for Robinhood Chain ──────────────────────────────────
const RH_TOKENS: Record<string, { address: Address; decimals: number }> = {
  WETH: { address: WETH_RH, decimals: 18 },
  ETH:  { address: WETH_RH, decimals: 18 }, // treated as WETH for swap
};

// ── ABIs ──────────────────────────────────────────────────────────────────────
const FACTORY_ABI = parseAbi([
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
]);

const POOL_ABI = parseAbi([
  "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
]);

const SWAP_ROUTER2_ABI = parseAbi([
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)",
]);

const WETH_ABI = parseAbi([
  "function deposit() external payable",
  "function withdraw(uint256 wad) external",
]);

// Fee tiers to try (in order of liquidity likelihood)
const FEE_TIERS = [3000, 500, 10000] as const; // 0.3%, 0.05%, 1%

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Compute amountOut from sqrtPriceX96 for an exactInput swap */
function computeAmountOut(
  sqrtPriceX96: bigint,
  amountIn: bigint,
  tokenInIsToken0: boolean,
  decimalsIn: number,
  decimalsOut: number,
): bigint {
  // price = (sqrtPriceX96 / 2^96)^2
  // If tokenIn is token0: price = token1 per token0
  // If tokenIn is token1: price = token0 per token1 = 1/price
  const Q96 = 2n ** 96n;
  const Q192 = 2n ** 192n;

  const decimalAdj = 10n ** BigInt(Math.abs(decimalsOut - decimalsIn));
  const priceNumerator = sqrtPriceX96 * sqrtPriceX96; // = price * 2^192

  if (tokenInIsToken0) {
    // amountOut = amountIn * price = amountIn * sqrtPX96^2 / 2^192
    if (decimalsOut >= decimalsIn) {
      return (amountIn * priceNumerator * decimalAdj) / Q192;
    } else {
      return (amountIn * priceNumerator) / (Q192 * decimalAdj);
    }
  } else {
    // amountOut = amountIn / price = amountIn * 2^192 / sqrtPX96^2
    if (decimalsOut >= decimalsIn) {
      return (amountIn * Q192 * decimalAdj) / priceNumerator;
    } else {
      return (amountIn * Q192) / (priceNumerator * decimalAdj);
    }
  }
}

/** Try to get a quote from Uniswap V3 pool on Robinhood Chain */
async function getRHChainQuote(
  tokenInAddr: Address,
  tokenOutAddr: Address,
  amountIn: bigint,
  decimalsIn: number,
  decimalsOut: number,
): Promise<{ amountOut: bigint; fee: number; poolAddress: Address } | null> {
  const client = createViemClient(RH_CHAIN_ID);

  for (const fee of FEE_TIERS) {
    try {
      const poolAddress = await client.readContract({
        address: UNI_V3_FACTORY,
        abi: FACTORY_ABI,
        functionName: "getPool",
        args: [tokenInAddr, tokenOutAddr, fee],
      }) as Address;

      if (!poolAddress || poolAddress === "0x0000000000000000000000000000000000000000") continue;

      const [token0, slot0Result] = await Promise.all([
        client.readContract({ address: poolAddress, abi: POOL_ABI, functionName: "token0" }) as Promise<Address>,
        client.readContract({ address: poolAddress, abi: POOL_ABI, functionName: "slot0" }) as unknown as Promise<[bigint, ...unknown[]]>,
      ]);

      const sqrtPriceX96 = slot0Result[0] as bigint;
      if (!sqrtPriceX96 || sqrtPriceX96 === 0n) continue;

      const tokenInIsToken0 = tokenInAddr.toLowerCase() === (token0 as string).toLowerCase();
      const amountOut = computeAmountOut(sqrtPriceX96, amountIn, tokenInIsToken0, decimalsIn, decimalsOut);

      if (amountOut > 0n) {
        return { amountOut, fee, poolAddress };
      }
    } catch {
      continue;
    }
  }
  return null;
}

/** Build SwapRouter2 exactInputSingle calldata */
function buildSwapCalldata(
  tokenIn: Address,
  tokenOut: Address,
  fee: number,
  recipient: Address,
  amountIn: bigint,
  amountOutMinimum: bigint,
): `0x${string}` {
  return encodeFunctionData({
    abi: SWAP_ROUTER2_ABI,
    functionName: "exactInputSingle",
    args: [{
      tokenIn,
      tokenOut,
      fee,
      recipient,
      amountIn,
      amountOutMinimum,
      sqrtPriceLimitX96: 0n,
    }],
  });
}

// ── GET /api/swap/quote ───────────────────────────────────────────────────────
router.get("/swap/quote", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { sellToken, buyToken, sellAmount, chainId: chainIdStr, recipient } = req.query;

  if (!sellToken || !buyToken || !sellAmount || !chainIdStr) {
    res.status(400).json({ error: "sellToken, buyToken, sellAmount, and chainId are required" });
    return;
  }

  const chainId = Number(chainIdStr);
  const amountIn = BigInt(String(sellAmount));
  const recipientAddr = (String(recipient || "0x0000000000000000000000000000000000000000")) as Address;

  // ── Robinhood Chain: on-chain Uniswap V3 quote ────────────────────────────
  if (chainId === RH_CHAIN_ID) {
    const sellSym = String(sellToken).toUpperCase();
    const buySym  = String(buyToken).toUpperCase();

    // Resolve symbols → addresses
    let tokenInAddr:  Address | undefined;
    let tokenOutAddr: Address | undefined;
    let decimalsIn  = 18;
    let decimalsOut = 18;

    // Accept either symbol or raw address
    if (String(sellToken).startsWith("0x")) {
      tokenInAddr = String(sellToken) as Address;
    } else {
      const t = RH_TOKENS[sellSym];
      if (t) { tokenInAddr = t.address; decimalsIn = t.decimals; }
    }

    if (String(buyToken).startsWith("0x")) {
      tokenOutAddr = String(buyToken) as Address;
    } else {
      const t = RH_TOKENS[buySym];
      if (t) { tokenOutAddr = t.address; decimalsOut = t.decimals; }
    }

    // ETH ↔ WETH: direct wrap/unwrap, no pool needed
    if (
      (sellSym === "ETH" && buySym === "WETH") ||
      (sellSym === "WETH" && buySym === "ETH")
    ) {
      const isWrap = sellSym === "ETH";
      const calldata = isWrap
        ? encodeFunctionData({ abi: WETH_ABI, functionName: "deposit" })
        : encodeFunctionData({ abi: WETH_ABI, functionName: "withdraw", args: [amountIn] });

      res.json({
        sellToken: String(sellToken),
        buyToken:  String(buyToken),
        sellAmount: String(amountIn),
        buyAmount:  String(amountIn), // 1:1
        guaranteedPrice: "1",
        price: "1",
        priceImpact: "0",
        estimatedGas: "50000",
        slippage: "0",
        to:    WETH_RH,
        data:  calldata,
        value: isWrap ? String(amountIn) : "0",
        provider: "weth-wrap",
      });
      return;
    }

    if (!tokenInAddr || !tokenOutAddr) {
      res.status(400).json({
        error: `Token not recognized on Robinhood Chain. Known tokens: ${Object.keys(RH_TOKENS).join(", ")}. Pass a raw 0x address for other tokens.`,
      });
      return;
    }

    try {
      const result = await getRHChainQuote(tokenInAddr, tokenOutAddr, amountIn, decimalsIn, decimalsOut);

      if (!result) {
        res.status(502).json({ error: "No Uniswap V3 pool found for this token pair on Robinhood Chain. The pair may not have liquidity yet." });
        return;
      }

      const { amountOut, fee } = result;
      // Apply 0.5% slippage for minimum out
      const amountOutMinimum = (amountOut * 995n) / 1000n;

      const calldata = buildSwapCalldata(tokenInAddr, tokenOutAddr, fee, recipientAddr, amountIn, amountOutMinimum);

      const price = amountOut > 0n
        ? (Number(amountOut) / Number(amountIn)).toFixed(8)
        : "0";

      res.json({
        sellToken: tokenInAddr,
        buyToken:  tokenOutAddr,
        sellAmount: String(amountIn),
        buyAmount:  String(amountOut),
        guaranteedPrice: (Number(amountOutMinimum) / Number(amountIn)).toFixed(8),
        price,
        priceImpact: null,
        estimatedGas: "200000",
        slippage: "0.5",
        to:    SWAP_ROUTER_V1,
        data:  calldata,
        value: sellSym === "ETH" ? String(amountIn) : "0",
        provider: `uniswap-v3-onchain (fee: ${fee / 10000}%)`,
      });
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      res.status(502).json({ error: `On-chain quote failed: ${msg}` });
      return;
    }
  }

  // ── Other chains: 0x API ──────────────────────────────────────────────────
  const zeroXApiKey = process.env.ZERO_X_API_KEY;
  if (!zeroXApiKey) {
    res.status(503).json({
      error: `Swap on chain ${chainId} requires ZERO_X_API_KEY. Robinhood Chain (4663) supports keyless on-chain quotes.`,
    });
    return;
  }

  try {
    const params = new URLSearchParams({
      sellToken: String(sellToken),
      buyToken:  String(buyToken),
      sellAmount: String(sellAmount),
    });

    const response = await fetch(`https://api.0x.org/swap/v1/quote?${params}`, {
      headers: { "0x-api-key": zeroXApiKey, "0x-chain-id": String(chainId) },
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(502).json({ error: `Swap API error: ${errText}` });
      return;
    }

    const data = await response.json() as {
      sellTokenAddress: string; buyTokenAddress: string;
      sellAmount: string; buyAmount: string;
      guaranteedPrice: string; price: string;
      estimatedGas: string; to: string; data: string; value: string;
    };

    res.json({
      sellToken: data.sellTokenAddress ?? String(sellToken),
      buyToken:  data.buyTokenAddress  ?? String(buyToken),
      sellAmount: data.sellAmount      ?? String(sellAmount),
      buyAmount:  data.buyAmount       ?? "0",
      guaranteedPrice: data.guaranteedPrice ?? null,
      price: data.price ?? "0",
      priceImpact: null,
      estimatedGas: data.estimatedGas ?? "200000",
      slippage: "0.5",
      to:    data.to   ?? null,
      data:  data.data ?? null,
      value: data.value ?? "0",
      provider: "0x",
    });
  } catch {
    res.status(502).json({ error: "Failed to fetch swap quote." });
  }
});

export default router;
