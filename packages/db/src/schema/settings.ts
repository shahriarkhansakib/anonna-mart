import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const adminSettings = pgTable("admin_settings", {
  id: text("id").primaryKey(), // e.g. "default"
  storeSettings: jsonb("store_settings")
    .$type<{
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      currency?: string;
      taxRate?: number;
      aboutText?: string;
      socialLinks?: { facebook?: string; instagram?: string; youtube?: string };
      logoUrl?: string;
      faviconUrl?: string;
    }>()
    .default({}),
  shippingSettings: jsonb("shipping_settings")
    .$type<{
      defaultCharge?: number;
      freeShippingThreshold?: number;
      enableFreeShipping?: boolean;
      estimatedDeliveryDays?: number;
      deliveryAreas?: string;
      courierName?: string;
    }>()
    .default({}),
  orderSettings: jsonb("order_settings")
    .$type<{
      minOrderAmount?: number;
      maxOrderAmount?: number;
      autoCancelHours?: number;
      enableCOD?: boolean;
      enableOnlinePayment?: boolean;
      lowStockThreshold?: number;
      orderPrefix?: string;
    }>()
    .default({}),
  notificationSettings: jsonb("notification_settings")
    .$type<{
      orderAlerts?: boolean;
      lowStockAlerts?: boolean;
      newCustomerAlerts?: boolean;
      emailNotifications?: boolean;
    }>()
    .default({}),
  connectors: jsonb("connectors")
    .$type<{
      steadfast?: { apiKey?: string; secretKey?: string; enabled?: boolean };
      facebookPixel?: { pixelId?: string; enabled?: boolean };
      googleTagManager?: { containerId?: string; enabled?: boolean };
    }>()
    .default({}),
  platformSettings: jsonb("platform_settings")
    .$type<{
      maintenanceMode?: boolean;
      maintenanceMessage?: string;
      enableRegistration?: boolean;
      enableSocialFeed?: boolean;
      enableAppointments?: boolean;
      enableShop?: boolean;
      maxPetsPerUser?: number;
      enableReviews?: boolean;
    }>()
    .default({}),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type AdminSettings = typeof adminSettings.$inferSelect;
export type NewAdminSettings = typeof adminSettings.$inferInsert;
