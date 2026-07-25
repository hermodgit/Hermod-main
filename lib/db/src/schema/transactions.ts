import { pgTable, text, integer, timestamp, jsonb, index, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionPlansTable = pgTable("transaction_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  agentId: uuid("agent_id"),
  walletAddress: text("wallet_address").notNull(),
  chainId: integer("chain_id").notNull(),
  actionType: text("action_type").notNull(),
  targetContract: text("target_contract"),
  recipientAddress: text("recipient_address"),
  tokenAddress: text("token_address"),
  tokenSymbol: text("token_symbol"),
  amount: text("amount"),
  calldata: text("calldata"),
  estimatedGas: text("estimated_gas"),
  riskLevel: text("risk_level").notNull().default("low"),
  riskWarnings: jsonb("risk_warnings").notNull().default([]),
  policyResult: jsonb("policy_result"),
  status: text("status").notNull().default("draft"), // draft | pending_approval | approved | rejected | signed | submitted | confirmed | failed
  transactionHash: text("transaction_hash"),
  explorerUrl: text("explorer_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("transaction_plans_user_id_idx").on(t.userId),
  index("transaction_plans_status_idx").on(t.status),
  index("transaction_plans_agent_id_idx").on(t.agentId),
]);

export const insertTransactionPlanSchema = createInsertSchema(transactionPlansTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTransactionPlan = z.infer<typeof insertTransactionPlanSchema>;
export type TransactionPlan = typeof transactionPlansTable.$inferSelect;
