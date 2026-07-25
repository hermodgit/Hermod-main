import { pgTable, text, timestamp, jsonb, index, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const auditLogsTable = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  agentId: uuid("agent_id"),
  walletAddress: text("wallet_address"),
  eventType: text("event_type").notNull(),
  eventData: jsonb("event_data"),
  transactionHash: text("transaction_hash"),
  status: text("status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("audit_logs_user_id_idx").on(t.userId),
  index("audit_logs_event_type_idx").on(t.eventType),
  index("audit_logs_wallet_idx").on(t.walletAddress),
  index("audit_logs_created_at_idx").on(t.createdAt),
]);

export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogsTable.$inferSelect;
