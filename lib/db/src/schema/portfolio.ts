import { pgTable, text, integer, timestamp, jsonb, index, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tokenContractsTable = pgTable("token_contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  chainId: integer("chain_id").notNull(),
  address: text("address").notNull(),
  symbol: text("symbol").notNull(),
  name: text("name"),
  decimals: integer("decimals").notNull().default(18),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const portfolioSnapshotsTable = pgTable("portfolio_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  chainId: integer("chain_id").notNull(),
  totalUsdValue: text("total_usd_value"),
  analyzedAt: timestamp("analyzed_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("portfolio_snapshots_user_id_idx").on(t.userId),
  index("portfolio_snapshots_wallet_idx").on(t.walletAddress),
]);

export const portfolioAssetsTable = pgTable("portfolio_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  snapshotId: uuid("snapshot_id").notNull().references(() => portfolioSnapshotsTable.id, { onDelete: "cascade" }),
  tokenAddress: text("token_address"),
  tokenSymbol: text("token_symbol").notNull(),
  tokenName: text("token_name"),
  balance: text("balance").notNull(),
  balanceFormatted: text("balance_formatted"),
  decimals: integer("decimals").notNull().default(18),
  usdValue: text("usd_value"),
  isNative: integer("is_native").notNull().default(0), // 0=false, 1=true
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPortfolioSnapshotSchema = createInsertSchema(portfolioSnapshotsTable).omit({ id: true, createdAt: true });
export type InsertPortfolioSnapshot = z.infer<typeof insertPortfolioSnapshotSchema>;
export type PortfolioSnapshot = typeof portfolioSnapshotsTable.$inferSelect;

export const insertPortfolioAssetSchema = createInsertSchema(portfolioAssetsTable).omit({ id: true, createdAt: true });
export type InsertPortfolioAsset = z.infer<typeof insertPortfolioAssetSchema>;
export type PortfolioAsset = typeof portfolioAssetsTable.$inferSelect;
