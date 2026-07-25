import { pgTable, text, integer, boolean, timestamp, jsonb, index, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const financialAgentsTable = pgTable("financial_agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  agentType: text("agent_type").notNull(), // 'payment' | 'treasury' | 'defi_execution' | 'risk_monitoring' | 'portfolio_analysis'
  walletAddress: text("wallet_address"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("financial_agents_user_id_idx").on(t.userId),
]);

export const agentPoliciesTable = pgTable("agent_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").notNull().references(() => financialAgentsTable.id, { onDelete: "cascade" }),
  maxTransactionAmount: text("max_transaction_amount"),
  maxDailySpend: text("max_daily_spend"),
  dailyTransactionLimit: integer("daily_transaction_limit"),
  requiresManualApproval: boolean("requires_manual_approval").notNull().default(true),
  maxSlippage: text("max_slippage"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const agentAllowedTokensTable = pgTable("agent_allowed_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").notNull().references(() => financialAgentsTable.id, { onDelete: "cascade" }),
  tokenAddress: text("token_address").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const agentAllowedProtocolsTable = pgTable("agent_allowed_protocols", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").notNull().references(() => financialAgentsTable.id, { onDelete: "cascade" }),
  protocol: text("protocol").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const agentBlockedAddressesTable = pgTable("agent_blocked_addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").notNull().references(() => financialAgentsTable.id, { onDelete: "cascade" }),
  address: text("address").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const agentAllowedRecipientsTable = pgTable("agent_allowed_recipients", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").notNull().references(() => financialAgentsTable.id, { onDelete: "cascade" }),
  address: text("address").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const agentActionsTable = pgTable("agent_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").notNull().references(() => financialAgentsTable.id, { onDelete: "cascade" }),
  actionType: text("action_type").notNull(),
  status: text("status").notNull().default("pending"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("agent_actions_agent_id_idx").on(t.agentId),
]);

export const insertAgentSchema = createInsertSchema(financialAgentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type FinancialAgent = typeof financialAgentsTable.$inferSelect;
