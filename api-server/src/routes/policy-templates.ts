import { pgTable, text, timestamp, boolean, jsonb, index, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Mirrors the existing policy shape stored in agent_policies + array tables */
export interface PolicyTemplateRules {
  maxTransactionAmount?: string | null;
  maxDailySpend?: string | null;
  dailyTransactionLimit?: number | null;
  requiresManualApproval?: boolean;
  maxSlippage?: string | null;
  allowedTokens?: string[];
  allowedProtocols?: string[];
  allowedRecipients?: string[];
  blockedAddresses?: string[];
}

export const policyTemplatesTable = pgTable("policy_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** null for built-in templates */
  userId: text("user_id"),
  name: text("name").notNull(),
  description: text("description"),
  /** e.g. "conservative" | "defi" | "institutional" | "custom" */
  category: text("category").notNull().default("custom"),
  /** Full policy rule set (mirrors PolicyTemplateRules) */
  rules: jsonb("rules").notNull().default({}),
  isBuiltIn: boolean("is_built_in").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("policy_templates_user_id_idx").on(t.userId),
  index("policy_templates_built_in_idx").on(t.isBuiltIn),
]);

export const insertPolicyTemplateSchema = createInsertSchema(policyTemplatesTable).omit({ id: true, createdAt: true });
export type InsertPolicyTemplate = z.infer<typeof insertPolicyTemplateSchema>;
export type PolicyTemplate = typeof policyTemplatesTable.$inferSelect;
