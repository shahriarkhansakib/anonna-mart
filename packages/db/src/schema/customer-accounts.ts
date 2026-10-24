import { relations } from "drizzle-orm";
import { doublePrecision, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const customerNotes = pgTable(
  "customer_notes",
  {
    id: text("id").primaryKey(),
    customerUserId: text("customer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("customer_notes_customer_user_id_idx").on(table.customerUserId),
    index("customer_notes_author_id_idx").on(table.authorId),
  ],
);

export const storeCredits = pgTable(
  "store_credits",
  {
    id: text("id").primaryKey(),
    customerUserId: text("customer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: doublePrecision("amount").notNull(),
    reason: text("reason").notNull().default("Store Courtesy Credit"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("store_credits_customer_user_id_idx").on(table.customerUserId),
    index("store_credits_created_by_idx").on(table.createdBy),
  ],
);

export const customerNotesRelations = relations(customerNotes, ({ one }) => ({
  customer: one(users, {
    fields: [customerNotes.customerUserId],
    references: [users.id],
  }),
  author: one(users, {
    fields: [customerNotes.authorId],
    references: [users.id],
  }),
}));

export const storeCreditsRelations = relations(storeCredits, ({ one }) => ({
  customer: one(users, {
    fields: [storeCredits.customerUserId],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [storeCredits.createdBy],
    references: [users.id],
  }),
}));

export type CustomerNote = typeof customerNotes.$inferSelect;
export type NewCustomerNote = typeof customerNotes.$inferInsert;
export type StoreCredit = typeof storeCredits.$inferSelect;
export type NewStoreCredit = typeof storeCredits.$inferInsert;
