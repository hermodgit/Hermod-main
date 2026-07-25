import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface UserPreferences {
  defaultChainId: number;
  defaultSlippage: string;
  displayCurrency: string;
  requirePolicyCheck: boolean;
  aiEnabled: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultChainId: 4663,
  defaultSlippage: "0.5",
  displayCurrency: "USD",
  requirePolicyCheck: true,
  aiEnabled: true,
};

export const profilesTable = pgTable("profiles", {
  id: text("id").primaryKey(), // Clerk user ID
  displayName: text("display_name"),
  email: text("email"),
  preferences: jsonb("preferences").$type<UserPreferences>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({ createdAt: true, updatedAt: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
