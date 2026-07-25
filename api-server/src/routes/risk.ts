import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, riskReportsTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { writeAuditLog } from "../lib/audit-helper";
import type { Request, Response } from "express";

const router: IRouter = Router();

interface Finding {
  code: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  recommendedAction?: string;
}

function formatReport(r: typeof riskReportsTable.$inferSelect) {
  return {
    id: r.id,
    targetAddress: r.targetAddress,
    targetType: r.targetType,
    riskLevel: r.riskLevel,
    findings: r.findings,
    recommendedActions: r.recommendedActions,
    verificationSource: r.verificationSource,
    explorerUrl: r.explorerUrl,
    createdAt: r.createdAt.toISOString(),
  };
}

function computeRiskLevel(findings: Finding[]): "low" | "medium" | "high" | "critical" {
  if (findings.some(f => f.severity === "critical")) return "critical";
  if (findings.some(f => f.severity === "high")) return "high";
  if (findings.some(f => f.severity === "medium")) return "medium";
  return "low";
}

// GoPlus Security API — token security check
async function goplusTokenSecurity(
  tokenAddress: string,
  chainId: number,
): Promise<{ findings: Finding[]; verificationSource: string | null }> {
  const findings: Finding[] = [];
  let verificationSource: string | null = null;

  // GoPlus chain IDs differ from EVM chain IDs in some cases
  const goplusChainId = String(chainId);

  try {
    const url = `https://api.gopluslabs.io/api/v1/token_security/${goplusChainId}?contract_addresses=${tokenAddress}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!resp.ok) throw new Error(`GoPlus HTTP ${resp.status}`);

    const data = await resp.json() as {
      code: number;
      result: Record<string, {
        is_honeypot?: string;
        is_mintable?: string;
        is_proxy?: string;
        is_blacklisted?: string;
        is_whitelisted?: string;
        can_take_back_ownership?: string;
        hidden_owner?: string;
        owner_change_balance?: string;
        selfdestruct?: string;
        external_call?: string;
        buy_tax?: string;
        sell_tax?: string;
        is_anti_whale?: string;
        is_true_token?: string;
        is_airdrop_scam?: string;
        is_open_source?: string;
        is_proxy_contract?: string;
        lp_holders_count?: string;
        holder_count?: string;
        total_supply?: string;
        lp_total_supply?: string;
        dex?: Array<{ name: string; liquidity: string }>;
      }>;
    };

    if (data.code !== 1) {
      findings.push({
        code: "GOPLUS_ERROR",
        severity: "low",
        description: `GoPlus security data unavailable (code ${data.code}). Analysis is limited.`,
      });
      return { findings, verificationSource };
    }

    verificationSource = "GoPlus Security API";
    const result = data.result[tokenAddress.toLowerCase()] ?? data.result[tokenAddress];
    if (!result) {
      findings.push({
        code: "NOT_FOUND_GOPLUS",
        severity: "medium",
        description: "Token not found in GoPlus security database. It may be very new or unlisted.",
        recommendedAction: "Exercise extreme caution with tokens not indexed by security providers.",
      });
      return { findings, verificationSource };
    }

    // Honeypot
    if (result.is_honeypot === "1") {
      findings.push({
        code: "HONEYPOT",
        severity: "critical",
        description: "This token is flagged as a HONEYPOT — you can buy but cannot sell. Do not interact.",
        recommendedAction: "Do not purchase or interact with this token.",
      });
    }

    // Open source / verification
    if (result.is_open_source === "0") {
      findings.push({
        code: "NOT_OPEN_SOURCE",
        severity: "high",
        description: "Contract source code is not verified/open-source. Hidden logic may exist.",
        recommendedAction: "Request source verification from the team or avoid interaction.",
      });
    }

    // Mintable — owner can mint unlimited tokens
    if (result.is_mintable === "1") {
      findings.push({
        code: "MINTABLE",
        severity: "high",
        description: "Contract owner can mint unlimited tokens, potentially diluting holders.",
        recommendedAction: "Verify the mint function has supply caps or is renounced.",
      });
    }

    // Ownership can be reclaimed
    if (result.can_take_back_ownership === "1") {
      findings.push({
        code: "RECLAIMABLE_OWNERSHIP",
        severity: "high",
        description: "Contract ownership was renounced but can be reclaimed, enabling rug pulls.",
        recommendedAction: "Treat this token as if ownership is active.",
      });
    }

    // Hidden owner
    if (result.hidden_owner === "1") {
      findings.push({
        code: "HIDDEN_OWNER",
        severity: "high",
        description: "Contract has a hidden owner address that is not publicly visible.",
        recommendedAction: "Assume the contract has an active, anonymous owner.",
      });
    }

    // Owner can change balances
    if (result.owner_change_balance === "1") {
      findings.push({
        code: "OWNER_CHANGE_BALANCE",
        severity: "critical",
        description: "Contract owner can arbitrarily change token balances of any holder.",
        recommendedAction: "Do not hold this token.",
      });
    }

    // Selfdestruct
    if (result.selfdestruct === "1") {
      findings.push({
        code: "SELF_DESTRUCT",
        severity: "high",
        description: "Contract can self-destruct, destroying all associated liquidity and token state.",
        recommendedAction: "Avoid long-term positions in this token.",
      });
    }

    // Airdrop scam
    if (result.is_airdrop_scam === "1") {
      findings.push({
        code: "AIRDROP_SCAM",
        severity: "critical",
        description: "This token is flagged as an airdrop scam designed to drain wallets.",
        recommendedAction: "Do not interact with this token. Revoke any approvals immediately.",
      });
    }

    // High taxes
    const buyTax = parseFloat(result.buy_tax ?? "0");
    const sellTax = parseFloat(result.sell_tax ?? "0");
    if (sellTax >= 50) {
      findings.push({
        code: "EXTREME_SELL_TAX",
        severity: "critical",
        description: `Sell tax is ${sellTax}% — effectively a honeypot. You will lose most of your investment on exit.`,
        recommendedAction: "Do not purchase this token.",
      });
    } else if (sellTax >= 20) {
      findings.push({
        code: "HIGH_SELL_TAX",
        severity: "high",
        description: `Sell tax is ${sellTax}%. You lose ${sellTax}% of value on every sale.`,
        recommendedAction: "Be aware of the high exit cost before purchasing.",
      });
    }

    if (buyTax >= 20) {
      findings.push({
        code: "HIGH_BUY_TAX",
        severity: "medium",
        description: `Buy tax is ${buyTax}%. You immediately lose ${buyTax}% on purchase.`,
      });
    }

    // Low liquidity
    const dex = result.dex ?? [];
    const totalLiquidity = dex.reduce((sum, d) => sum + parseFloat(d.liquidity ?? "0"), 0);
    if (dex.length === 0) {
      findings.push({
        code: "NO_LIQUIDITY",
        severity: "high",
        description: "No DEX liquidity pools found for this token.",
        recommendedAction: "Verify trading is possible before purchasing.",
      });
    } else if (totalLiquidity < 10000) {
      findings.push({
        code: "LOW_LIQUIDITY",
        severity: "medium",
        description: `Total DEX liquidity is $${totalLiquidity.toFixed(0)} — extremely low. High slippage and rug risk.`,
        recommendedAction: "Avoid large positions; low liquidity enables price manipulation.",
      });
    }

    // Clean finding if nothing bad found
    if (findings.length === 0) {
      findings.push({
        code: "CLEAN",
        severity: "low",
        description: "No critical security issues detected by GoPlus Security analysis.",
      });
    }

    return { findings, verificationSource };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    findings.push({
      code: "GOPLUS_UNAVAILABLE",
      severity: "low",
      description: `GoPlus Security API unavailable: ${message}. Analysis uses fallback checks only.`,
    });
    return { findings, verificationSource };
  }
}

// Blockscout explorer URL map (free public API, no key needed)
const BLOCKSCOUT_URLS: Record<number, string> = {
  4663:    "https://robinhoodchain.blockscout.com",
  1:       "https://eth.blockscout.com",
  8453:    "https://base.blockscout.com",
  10:      "https://optimism.blockscout.com",
  42161:   "https://arbitrum.blockscout.com",
  137:     "https://polygon.blockscout.com",
};

// Blockscout + on-chain wallet security check (replaces GoPlus address_security which needs auth)
async function blockscoutAddressSecurity(
  address: string,
  chainId: number,
): Promise<{ findings: Finding[]; verificationSource: string | null }> {
  const findings: Finding[] = [];
  const explorerBase = BLOCKSCOUT_URLS[chainId];

  try {
    if (!explorerBase) {
      findings.push({
        code: "EXPLORER_UNSUPPORTED",
        severity: "low",
        description: `No block explorer configured for chain ${chainId}. Basic format validation only.`,
      });
      return { findings, verificationSource: null };
    }

    const resp = await fetch(
      `${explorerBase}/api/v2/addresses/${address}`,
      { signal: AbortSignal.timeout(8000) },
    );

    if (!resp.ok) throw new Error(`Explorer HTTP ${resp.status}`);

    const data = await resp.json() as {
      is_contract?: boolean;
      is_verified?: boolean;
      name?: string | null;
      public_tags?: Array<{ label: string; display_name: string; slug: string }>;
      watchlist_names?: Array<{ display_name: string; label: string }>;
      implementations?: Array<{ address: string }>;
    };

    const verificationSource = `Blockscout (${explorerBase})`;

    // Public tags — Blockscout tags known scammers, hackers, bridges, etc.
    const dangerTags = ["scam", "hack", "phish", "exploit", "sanction", "blacklist", "rug"];
    const publicTags = data.public_tags ?? [];
    for (const tag of publicTags) {
      const label = (tag.label ?? tag.display_name ?? tag.slug ?? "").toLowerCase();
      const isDangerous = dangerTags.some(d => label.includes(d));
      findings.push({
        code: "EXPLORER_TAG_" + label.toUpperCase().replace(/[^A-Z0-9]/g, "_"),
        severity: isDangerous ? "critical" : "medium",
        description: `Address is publicly tagged "${tag.display_name || tag.label}" on the block explorer.`,
        recommendedAction: isDangerous ? "Do not transact with this address." : undefined,
      });
    }

    // Watchlist flags
    for (const wl of data.watchlist_names ?? []) {
      findings.push({
        code: "WATCHLIST_FLAG",
        severity: "high",
        description: `Address appears on watchlist: "${wl.display_name || wl.label}".`,
        recommendedAction: "Verify the identity of this address before transacting.",
      });
    }

    // Contract checks
    if (data.is_contract) {
      if (!data.is_verified) {
        findings.push({
          code: "UNVERIFIED_CONTRACT",
          severity: "high",
          description: "This address is a smart contract with unverified source code. Hidden logic may exist.",
          recommendedAction: "Do not interact with unverified contracts unless you trust the deployer.",
        });
      } else {
        findings.push({
          code: "VERIFIED_CONTRACT",
          severity: "low",
          description: `Verified smart contract${data.name ? `: ${data.name}` : ""}. Source code is publicly auditable on the explorer.`,
        });
      }

      if ((data.implementations ?? []).length > 0) {
        findings.push({
          code: "PROXY_CONTRACT",
          severity: "medium",
          description: "This is a proxy contract — its logic can be upgraded by the owner.",
          recommendedAction: "Verify the proxy owner and implementation contract before interacting.",
        });
      }
    }

    if (findings.length === 0) {
      findings.push({
        code: "CLEAN",
        severity: "low",
        description: "No security flags found. This is an externally owned account (EOA) with no public risk tags on the block explorer.",
      });
    }

    return { findings, verificationSource };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    findings.push({
      code: "EXPLORER_UNAVAILABLE",
      severity: "low",
      description: `Block explorer check failed: ${message}. Address format is valid.`,
    });
    return { findings, verificationSource: null };
  }
}

// Blockscout contract verification check (for token analysis)
async function blockscoutContractCheck(
  address: string,
  chainId: number,
): Promise<Finding[]> {
  const explorerBase = BLOCKSCOUT_URLS[chainId];
  if (!explorerBase) return [];
  const findings: Finding[] = [];
  try {
    const resp = await fetch(`${explorerBase}/api/v2/addresses/${address}`, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return findings;
    const data = await resp.json() as { is_contract?: boolean; is_verified?: boolean; name?: string | null };

    if (data.is_contract && !data.is_verified) {
      findings.push({
        code: "UNVERIFIED_CONTRACT",
        severity: "high",
        description: "Contract source code is not verified on the block explorer.",
        recommendedAction: "Exercise caution with unverified contracts.",
      });
    } else if (data.is_contract && data.is_verified) {
      findings.push({
        code: "VERIFIED_CONTRACT",
        severity: "low",
        description: `Contract verified${data.name ? `: ${data.name}` : ""}. Source code is publicly auditable.`,
      });
    }
  } catch { /* ignore */ }
  return findings;
}

async function analyzeAddress(
  userId: string,
  targetAddress: string,
  targetType: "wallet" | "token",
  chainId: number,
  res: Response,
): Promise<void> {
  // Basic format validation
  if (!/^0x[0-9a-fA-F]{40}$/.test(targetAddress)) {
    const report = await saveReport(userId, {
      targetAddress: targetAddress.toLowerCase(),
      targetType,
      chainId: String(chainId),
      riskLevel: "critical",
      findings: [{
        code: "INVALID_ADDRESS",
        severity: "critical",
        description: "Address format is invalid — not a valid EVM address.",
        recommendedAction: "Verify the address and try again.",
      }],
      recommendedActions: ["Verify the address format before transacting."],
      verificationSource: null,
      explorerUrl: null,
    });
    res.json(formatReport(report));
    return;
  }

  const allFindings: Finding[] = [];
  let verificationSource: string | null = null;

  if (targetType === "token") {
    // GoPlus token_security — free, no key needed, supports Robinhood Chain
    const { findings, verificationSource: vs } = await goplusTokenSecurity(targetAddress, chainId);
    allFindings.push(...findings);
    if (vs) verificationSource = vs;

    // Also run Blockscout contract verification check
    const explorerFindings = await blockscoutContractCheck(targetAddress, chainId);
    // Only add if GoPlus didn't already cover source verification
    if (!allFindings.some(f => f.code.includes("OPEN_SOURCE") || f.code.includes("VERIFIED"))) {
      allFindings.push(...explorerFindings);
    }
    if (!verificationSource && explorerFindings.length > 0) {
      verificationSource = BLOCKSCOUT_URLS[chainId] ?? null;
    }
  } else {
    // Wallet: use Blockscout public API (GoPlus address_security requires paid auth)
    const { findings, verificationSource: vs } = await blockscoutAddressSecurity(targetAddress, chainId);
    allFindings.push(...findings);
    if (vs) verificationSource = vs;
  }

  const riskLevel = computeRiskLevel(allFindings);
  const explorerBase = BLOCKSCOUT_URLS[chainId] ?? "https://etherscan.io";
  const explorerUrl = `${explorerBase}/address/${targetAddress}`;

  const recommendedActions = allFindings
    .filter(f => f.recommendedAction)
    .map(f => f.recommendedAction as string);

  const report = await saveReport(userId, {
    targetAddress: targetAddress.toLowerCase(),
    targetType,
    chainId: String(chainId),
    riskLevel,
    findings: allFindings,
    recommendedActions,
    verificationSource,
    explorerUrl,
  });

  void writeAuditLog({
    userId,
    walletAddress: targetAddress,
    eventType: `risk_${targetType}_analyzed`,
    eventData: { chainId, riskLevel, findingCount: allFindings.length },
    status: "success",
  });

  res.json(formatReport(report));
}

async function saveReport(userId: string, data: {
  targetAddress: string;
  targetType: string;
  chainId: string;
  riskLevel: string;
  findings: unknown[];
  recommendedActions: string[];
  verificationSource: string | null;
  explorerUrl: string | null;
}) {
  const [report] = await db.insert(riskReportsTable).values({
    userId,
    targetAddress: data.targetAddress,
    targetType: data.targetType,
    chainId: data.chainId,
    riskLevel: data.riskLevel,
    findings: data.findings as never,
    recommendedActions: data.recommendedActions as never,
    verificationSource: data.verificationSource,
    explorerUrl: data.explorerUrl,
  }).returning();
  return report;
}

// GET /api/risk/reports
router.get("/risk/reports", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const reports = await db.select().from(riskReportsTable)
    .where(eq(riskReportsTable.userId, userId))
    .orderBy(desc(riskReportsTable.createdAt))
    .limit(50);
  res.json(reports.map(formatReport));
});

// POST /api/risk/analyze-wallet
router.post("/risk/analyze-wallet", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const { walletAddress, chainId = 1 } = req.body;
  if (!walletAddress || typeof walletAddress !== "string") {
    res.status(400).json({ error: "walletAddress is required" });
    return;
  }
  await analyzeAddress(userId, walletAddress, "wallet", chainId, res);
});

// POST /api/risk/analyze-token
router.post("/risk/analyze-token", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const { tokenAddress, chainId = 1 } = req.body;
  if (!tokenAddress || typeof tokenAddress !== "string") {
    res.status(400).json({ error: "tokenAddress is required" });
    return;
  }
  await analyzeAddress(userId, tokenAddress, "token", chainId, res);
});

export default router;
