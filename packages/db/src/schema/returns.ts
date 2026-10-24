import { relations } from "drizzle-orm";
import { boolean, doublePrecision, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { orders } from "./orders";

export const orderReturns = pgTable("order_returns", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  customerUserId: text("customer_user_id"),
  kind: text("kind").notNull().default("return"), // return, exchange, refund
  status: text("status").notNull().default("requested"), // requested, approved, received, completed, rejected
  reason: text("reason").notNull(),
  items: jsonb("items").$type<any[]>().default([]).notNull(),
  refundAmount: doublePrecision("refund_amount").notNull().default(0),
  refundMethod: text("refund_method").notNull().default("original"),
  restock: boolean("restock").default(true).notNull(),
  restocked: boolean("restocked").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const orderReturnsRelations = relations(orderReturns, ({ one }) => ({
  order: one(orders, {
    fields: [orderReturns.orderId],
    references: [orders.id],
  }),
  customerUser: one(users, {
    fields: [orderReturns.customerUserId],
    references: [users.id],
  }),
}));

export type OrderReturn = typeof orderReturns.$inferSelect;
export type NewOrderReturn = typeof orderReturns.$inferInsert;
