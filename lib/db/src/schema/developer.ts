import { pgTable, text, boolean, timestamp, index, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const developerApiKeysTable = pgTable("developer_api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  label: text("label").notNull(),
  prefix: text("prefix").notNull(), // first 8 chars for display
  hashedKey: text("hashed_key").notNull(), // SHA-256 hash of the full key
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("developer_api_keys_user_id_idx").on(t.userId),
  index("developer_api_keys_hashed_key_idx").on(t.hashedKey),
]);

export const insertDeveloperApiKeySchema = createInsertSchema(developerApiKeysTable).omit({ id: true, createdAt: true });
export type InsertDeveloperApiKey = z.infer<typeof insertDeveloperApiKeySchema>;
export type DeveloperApiKey = typeof developerApiKeysTable.$inferSelect;
