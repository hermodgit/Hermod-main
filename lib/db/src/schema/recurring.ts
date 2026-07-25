import { pgTable, text, integer, timestamp, index, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recurringPlansTable = pgTable("recurring_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  agentId: uuid("agent_id"),
  walletAddress: text("wallet_address").notNull(),
  chainId: integer("chain_id").notNull(),
  recipientAddress: text("recipient_address").notNull(),
  tokenAddress: text("token_address"),
  tokenSymbol: text("token_symbol").notNull(),
  amount: text("amount").notNull(),
  frequency: text("frequency").notNull(), // 'daily' | 'weekly' | 'monthly'
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  maxExecutions: integer("max_executions"),
  executionCount: integer("execution_count").notNull().default(0),
  status: text("status").notNull().default("active"), // 'active' | 'paused' | 'completed' | 'failed'
  nextExecutionAt: timestamp("next_execution_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("recurring_plans_user_id_idx").on(t.userId),
  index("recurring_plans_status_idx").on(t.status),
]);

export const recurringExecutionsTable = pgTable("recurring_executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  recurringPlanId: uuid("recurring_plan_id").notNull().references(() => recurringPlansTable.id, { onDelete: "cascade" }),
  transactionPlanId: uuid("transaction_plan_id"),
  status: text("status").notNull().default("pending"),
  transactionHash: text("transaction_hash"),
  errorMessage: text("error_message"),
  executedAt: timestamp("executed_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("recurring_executions_plan_id_idx").on(t.recurringPlanId),
]);

export const insertRecurringPlanSchema = createInsertSchema(recurringPlansTable).omit({ id: true, createdAt: true, updatedAt: true, executionCount: true });
export type InsertRecurringPlan = z.infer<typeof insertRecurringPlanSchema>;
export type RecurringPlan = typeof recurringPlansTable.$inferSelect;
