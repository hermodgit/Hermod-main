import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";
import { db, profilesTable, DEFAULT_PREFERENCES, type UserPreferences } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

// ── System status ─────────────────────────────────────────────────────────────
interface StatusItem {
  key: string;
  label: string;
  feature: string;
  configured: boolean;
  required: boolean;
}

function buildStatusItems(): StatusItem[] {
  const env = process.env;
  return [
    // Core — must be present for the app to function
    { key: "DATABASE_URL",     label: "Database",         feature: "Core",   required: true,
      configured: Boolean(env.DATABASE_URL) },
    { key: "CLERK_SECRET_KEY", label: "Authentication",   feature: "Core",   required: true,
      configured: Boolean(env.CLERK_SECRET_KEY) },

    // AI — Replit AI integration keys take precedence over direct OPENAI_API_KEY
    { key: "AI_INTEGRATIONS_OPENAI_API_KEY", label: "AI Intent Parser", feature: "AI", required: false,
      configured: Boolean(env.AI_INTEGRATIONS_OPENAI_API_KEY || env.OPENAI_API_KEY) },
    { key: "AI_INTEGRATIONS_OPENAI_BASE_URL", label: "AI Base URL",     feature: "AI", required: false,
      configured: Boolean(env.AI_INTEGRATIONS_OPENAI_BASE_URL || env.OPENAI_BASE_URL) },

    // Swap — Robinhood Chain (4663) uses keyless on-chain Uniswap V3 quotes;
    // ZERO_X_API_KEY unlocks swap quoting on other EVM chains (Ethereum, Base, etc.)
    { key: "SWAP", label: "Swap (Uniswap V3 on-chain)", feature: "Swap", required: false,
      configured: true },

    // Risk — GoPlus Security API is the primary engine (free, no key required);
    // RH_EXPLORER_API_KEY optionally adds Blockscout contract verification
    { key: "RISK", label: "Risk (GoPlus Security)", feature: "Risk", required: false,
      configured: true },

    // Wallet — WalletConnect works with a fallback project ID even without an explicit env var
    { key: "WALLETCONNECT_PROJECT_ID", label: "WalletConnect", feature: "Wallet", required: false,
      configured: true },
  ];
}

// GET /api/settings/status
router.get("/settings/status", async (_req: Request, res: Response): Promise<void> => {
  const items = buildStatusItems();

  const allRequiredConfigured = items
    .filter(i => i.required)
    .every(i => i.configured);

  res.json({ items, allRequiredConfigured });
});

// GET /api/settings/preferences
router.get("/settings/preferences", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, userId));
  const prefs: UserPreferences = { ...DEFAULT_PREFERENCES, ...(profile?.preferences ?? {}) };

  res.json(prefs);
});

// PATCH /api/settings/preferences
router.patch("/settings/preferences", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const updates = req.body as Partial<UserPreferences>;

  // Validate fields
  const allowed: (keyof UserPreferences)[] = [
    "defaultChainId", "defaultSlippage", "displayCurrency", "requirePolicyCheck", "aiEnabled",
  ];
  const sanitized: Partial<UserPreferences> = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) (sanitized as any)[key] = updates[key];
  }

  const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.id, userId));

  const merged: UserPreferences = {
    ...DEFAULT_PREFERENCES,
    ...(existing?.preferences ?? {}),
    ...sanitized,
  };

  if (existing) {
    await db.update(profilesTable)
      .set({ preferences: merged })
      .where(eq(profilesTable.id, userId));
  } else {
    await db.insert(profilesTable).values({
      id: userId,
      preferences: merged,
    });
  }

  res.json(merged);
});

export default router;
