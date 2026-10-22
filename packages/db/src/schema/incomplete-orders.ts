import { doublePrecision, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const incompleteOrders = pgTable("incomplete_orders", {
  id: text("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  shippingAddress: text("shipping_address"),
  items: jsonb("items").$type<any[]>().default([]).notNull(),
  totalAmount: doublePrecision("total_amount").notNull().default(0),
  status: text("status").notNull().default("abandoned"), // abandoned, contacting, recovered, expired
  notes: text("notes"),
  recoveredAt: timestamp("recovered_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type IncompleteOrder = typeof incompleteOrders.$inferSelect;
export type NewIncompleteOrder = typeof incompleteOrders.$inferInsert;
