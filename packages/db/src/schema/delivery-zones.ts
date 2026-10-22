import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const deliveryZones = pgTable("delivery_zones", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  district: text("district").notNull(),
  standardFee: doublePrecision("standard_fee").notNull().default(60),
  estimatedDeliveryHours: integer("estimated_delivery_hours").notNull().default(24),
  estimatedDays: text("estimated_days"),
  divisions: jsonb("divisions").$type<string[]>().default([]).notNull(),
  steadfastCityId: integer("steadfast_city_id"),
  steadfastZoneId: integer("steadfast_zone_id"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type DeliveryZone = typeof deliveryZones.$inferSelect;
export type NewDeliveryZone = typeof deliveryZones.$inferInsert;
