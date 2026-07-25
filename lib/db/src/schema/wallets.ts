import { pgTable, text, integer, boolean, timestamp, index, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const walletsTable = pgTable("wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  address: text("address").notNull(),
  chainId: integer("chain_id").notNull(),
  chainName: text("chain_name"),
  label: text("label"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("wallets_user_id_idx").on(t.userId),
  index("wallets_address_idx").on(t.address),
]);

export const insertWalletSchema = createInsertSchema(walletsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof walletsTable.$inferSelect;
