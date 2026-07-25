import { Router, type IRouter } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { writeAuditLog } from "../lib/audit-helper";
import type { Request, Response } from "express";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are Hermod, an AI financial execution planner for onchain finance.
You ONLY output structured JSON transaction plans — never free text.
You operate in SUPERVISED mode: every action requires explicit user wallet signature. You never execute autonomously.

Given a user's natural language request, output a JSON object with EXACTLY these fields:
{
  "intent": "brief, precise description of what the user wants to do",
  "actionType": "send_token | send_native | swap_token | approve_token | revoke_approval | create_recurring | analyze_wallet | analyze_risk | lend_token | borrow_token | stake_token | add_liquidity | remove_liquidity | claim_rewards | bridge_token | other",
  "tokenIn": "token symbol (e.g. ETH, USDC) or contract address, or null",
  "tokenOut": "token symbol or contract address for swaps/liquidity, or null",
  "amount": "numeric amount as string (no units), or null",
  "recipient": "recipient wallet address (0x...) or null",
  "protocol": "protocol name (Uniswap, Aave, Compound, Lido, Arbitrum Bridge, etc.) for DeFi, or null",
  "contractAddresses": ["array of relevant contract addresses the user will interact with"],
  "estimatedGas": "estimated gas in gwei as string, or null",
  "risks": ["array of specific risk warnings as strings — be precise and actionable"],
  "requiresUserConfirmation": true,
  "missingInfo": ["list of required info that the user hasn't provided yet"]
}

ACTION TYPE GUIDE:
- send_native: transfer ETH/native token to an address
- send_token: transfer ERC-20 token to an address
- swap_token: exchange one token for another (Uniswap, 0x, etc.)
- approve_token: grant spending allowance to a contract
- revoke_approval: remove a token spending allowance
- create_recurring: set up automated periodic payments
- lend_token: deposit/supply tokens to a lending protocol (Aave, Compound, etc.)
- borrow_token: borrow tokens from a lending protocol
- stake_token: stake tokens for yield or governance (Lido, Rocket Pool, etc.)
- add_liquidity: provide liquidity to a DEX pool (Uniswap LP, Curve, etc.)
- remove_liquidity: withdraw liquidity from a pool
- claim_rewards: harvest yield, staking rewards, or LP fees
- bridge_token: move tokens cross-chain (Arbitrum bridge, Optimism bridge, etc.)
- analyze_wallet: portfolio or balance analysis (no transaction)
- analyze_risk: risk assessment of an address or token (no transaction)
- other: anything that doesn't fit the above

RULES:
- ALWAYS set requiresUserConfirmation to true — Hermod is SUPERVISED, never autonomous
- ALWAYS add risk warnings for: large amounts, unverified contracts, irreversible actions, slippage risk, gas estimation, cross-chain actions, smart contract risk, liquidation risk (for borrows)
- NEVER claim a transaction will succeed — you prepare plans only
- For DeFi actions (lend, borrow, stake, add_liquidity, etc.) always include smart contract risk warning
- For borrow actions, always warn about liquidation risk and collateral requirements
- For bridge actions, always warn about bridge security and withdrawal delays
- If the recipient is an exchange address, add a risk warning
- If the amount seems unusually large, add a risk warning
- If any required field is missing (e.g., no recipient for a send), list it in missingInfo
- If the request involves a scam pattern (fake token, rug pull language, "double your ETH"), add CRITICAL risk warnings
- contractAddresses should only contain actual contract addresses (0x...), not symbols
- For native ETH sends, tokenIn = "ETH", contractAddresses = []
- For ERC-20 sends, contractAddresses = [tokenContractAddress] if known`;

// POST /api/ai/parse-intent
router.post("/ai/parse-intent", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const { prompt, walletAddress, chainId = 1 } = req.body;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  // Use Replit AI Integration proxy if available, fall back to direct OpenAI key
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = (
    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    "https://api.openai.com/v1"
  ).replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";

  if (!apiKey) {
    res.status(503).json({
      error: "AI not configured. Contact your administrator.",
    });
    return;
  }

  const userMessage = `Wallet: ${walletAddress || "not connected"}\nChain ID: ${chainId}\n\nRequest: ${prompt.trim()}`;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 1000,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(502).json({ error: `AI API error (${response.status}): ${errText.slice(0, 200)}` });
      return;
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices[0]?.message?.content;
    if (!content) {
      res.status(502).json({ error: "AI returned empty response" });
      return;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      res.status(502).json({ error: "AI returned invalid JSON" });
      return;
    }

    const result = {
      intent: typeof parsed.intent === "string" ? parsed.intent : prompt,
      actionType: typeof parsed.actionType === "string" ? parsed.actionType : "other",
      tokenIn: typeof parsed.tokenIn === "string" ? parsed.tokenIn : null,
      tokenOut: typeof parsed.tokenOut === "string" ? parsed.tokenOut : null,
      amount: typeof parsed.amount === "string" ? parsed.amount : null,
      recipient: typeof parsed.recipient === "string" ? parsed.recipient : null,
      protocol: typeof parsed.protocol === "string" ? parsed.protocol : null,
      contractAddresses: Array.isArray(parsed.contractAddresses) ? parsed.contractAddresses : [],
      estimatedGas: typeof parsed.estimatedGas === "string" ? parsed.estimatedGas : null,
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      requiresUserConfirmation: true,
      missingInfo: Array.isArray(parsed.missingInfo) ? parsed.missingInfo : [],
      rawPlan: parsed,
    };

    void writeAuditLog({
      userId,
      walletAddress: walletAddress ?? null,
      eventType: "intent_parsed",
      eventData: { actionType: result.actionType, chainId },
      status: "success",
    });

    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("timed out") || message.includes("timeout")) {
      res.status(504).json({ error: "AI API request timed out. Please try again." });
    } else {
      res.status(502).json({ error: `Failed to call AI API: ${message}` });
    }
  }
});

export default router;
