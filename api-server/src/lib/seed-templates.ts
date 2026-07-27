/**
 * Seeds the three built-in policy templates if they don't exist.
 * Called once at server startup — idempotent.
 */
import { eq } from "drizzle-orm";
import { db, policyTemplatesTable } from "@workspace/db";
import { logger } from "./logger";

const BUILT_IN_TEMPLATES = [
  {
    name: "Conservative",
    description: "Low spend limits with stablecoins only. Ideal for automated treasury management where safety takes priority over yield.",
    category: "conservative",
    rules: {
      maxTransactionAmount: "500",
      maxDailySpend: "2000",
      dailyTransactionLimit: 5,
      requiresManualApproval: true,
      maxSlippage: "0.5",
      allowedTokens: [],   // stablecoin-only enforced by allowedProtocols + manual approval
      allowedProtocols: [],
      allowedRecipients: [],
      blockedAddresses: [],
    },
  },
  {
    name: "DeFi Active",
    description: "Medium limits with Aave, Uniswap, and Lido allowed. Optimized for active DeFi yield strategies with reasonable autonomy.",
    category: "defi",
    rules: {
      maxTransactionAmount: "5000",
      maxDailySpend: "20000",
      dailyTransactionLimit: 20,
      requiresManualApproval: false,
      maxSlippage: "2.0",
      allowedTokens: [],
      allowedProtocols: ["Aave", "Uniswap", "Lido", "Curve", "Compound"],
      allowedRecipients: [],
      blockedAddresses: [],
    },
  },
  {
    name: "Institutional",
    description: "High limits with full audit trail, manual approval required on every action, and single-chain restriction. Built for compliance-heavy environments.",
    category: "institutional",
    rules: {
      maxTransactionAmount: "100000",
      maxDailySpend: "500000",
      dailyTransactionLimit: 10,
      requiresManualApproval: true,
      maxSlippage: "0.1",
      allowedTokens: [],
      allowedProtocols: [],
      allowedRecipients: [],
      blockedAddresses: [],
    },
  },
];

export async function seedBuiltInTemplates(): Promise<void> {
  try {
    const existing = await db
      .select({ id: policyTemplatesTable.id })
      .from(policyTemplatesTable)
      .where(eq(policyTemplatesTable.isBuiltIn, true));

    if (existing.length >= BUILT_IN_TEMPLATES.length) return; // already seeded

    for (const tpl of BUILT_IN_TEMPLATES) {
      // Check by name to avoid duplicates
      const [has] = await db
        .select({ id: policyTemplatesTable.id })
        .from(policyTemplatesTable)
        .where(eq(policyTemplatesTable.name, tpl.name));

      if (!has) {
        await db.insert(policyTemplatesTable).values({
          userId: null,
          name: tpl.name,
          description: tpl.description,
          category: tpl.category,
          rules: tpl.rules,
          isBuiltIn: true,
        });
        logger.info({ name: tpl.name }, "Seeded built-in policy template");
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed built-in policy templates");
  }
}
