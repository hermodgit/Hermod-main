import { pgTable, text, timestamp, jsonb, index, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const riskReportsTable = pgTable("risk_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  targetAddress: text("target_address").notNull(),
  targetType: text("target_type").notNull(), // 'wallet' | 'token'
  chainId: text("chain_id"),
  riskLevel: text("risk_level").notNull(), // 'low' | 'medium' | 'high' | 'critical'
  findings: jsonb("findings").notNull().default([]),
  recommendedActions: jsonb("recommended_actions").notNull().default([]),
  verificationSource: text("verification_source"),
  explorerUrl: text("explorer_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("risk_reports_user_id_idx").on(t.userId),
  index("risk_reports_target_idx").on(t.targetAddress),
]);

export const insertRiskReportSchema = createInsertSchema(riskReportsTable).omit({ id: true, createdAt: true });
export type InsertRiskReport = z.infer<typeof insertRiskReportSchema>;
export type RiskReport = typeof riskReportsTable.$inferSelect;
