/**
 * permissions-registry.ts
 *
 * CANONICAL SINGLE SOURCE OF TRUTH for all store PBAC (Permission-Based Access Control)
 * permissions across GrowMate.
 *
 * Rules:
 * 1. Every permission in the database must be defined here in `PERMISSIONS_CATALOG`.
 * 2. All permissions follow the canonical `<domain>:<action>` naming convention.
 * 3. Never use raw magic strings in API routes or frontend `<Can>` gates.
 *    Always use the strongly-typed `AppPermission` type.
 */

export const PERMISSIONS_CATALOG = [
  // =========================================================================
  // 1. Products & Inventory
  // =========================================================================
  {
    key: "products:view",
    category: "Products",
    description: "View product catalog, SKU details, and stock levels",
  },
  {
    key: "products:create",
    category: "Products",
    description: "Create new products, categories, and inventory items",
  },
  {
    key: "products:edit",
    category: "Products",
    description: "Update product details, pricing, stock, images, and status",
  },
  {
    key: "products:delete",
    category: "Products",
    description: "Delete or archive products and inventory items",
  },

  // =========================================================================
  // 2. Orders & Fulfillment
  // =========================================================================
  {
    key: "orders:view",
    category: "Orders",
    description: "View customer order records, invoices, and payment statuses",
  },
  {
    key: "orders:update_status",
    category: "Orders",
    description: "Advance order status (processing, shipped, delivered, consigned)",
  },
  {
    key: "orders:cancel",
    category: "Orders",
    description: "Cancel, reject, or mark orders as returned",
  },
  {
    key: "orders:delete",
    category: "Orders",
    description: "Permanently delete or trash order records",
  },
  {
    key: "orders:export",
    category: "Orders",
    description: "Export customer orders to CSV or reporting spreadsheets",
  },

  // =========================================================================
  // 3. Coupons & Promotions
  // =========================================================================
  {
    key: "coupons:view",
    category: "Marketing",
    description: "View discount codes, usage limits, and redemption statistics",
  },
  {
    key: "coupons:manage",
    category: "Marketing",
    description: "Create, edit, and deactivate coupon codes and discounts",
  },

  // =========================================================================
  // 4. Delivery Zones & Couriers
  // =========================================================================
  {
    key: "delivery:view",
    category: "Logistics",
    description: "View delivery regions, shipping rates, and courier settings",
  },
  {
    key: "delivery:manage",
    category: "Logistics",
    description: "Configure shipping zones, courier API credentials, and delivery rates",
  },

  // =========================================================================
  // 5. CMS & Storefront Content
  // =========================================================================
  {
    key: "cms:view",
    category: "Content",
    description: "View storefront banners, announcements, and policy pages",
  },
  {
    key: "cms:manage",
    category: "Content",
    description: "Create, edit, and publish banners and CMS marketing content",
  },

  // =========================================================================
  // 6. Customer Support & Chat
  // =========================================================================
  {
    key: "support:view",
    category: "Support",
    description: "View customer inquiries, live chat messages, and tickets",
  },
  {
    key: "support:reply",
    category: "Support",
    description: "Reply to customer messages and resolve support inquiries",
  },

  // =========================================================================
  // 7. Customers & User Accounts
  // =========================================================================
  {
    key: "customers:view",
    category: "Customers",
    description: "View customer profiles, order histories, and contact info",
  },
  {
    key: "customers:edit",
    category: "Customers",
    description: "Update customer profile details, phone numbers, and addresses",
  },
  {
    key: "customers:manage_status",
    category: "Customers",
    description: "Ban, suspend, or force password reset on customer accounts",
  },

  // =========================================================================
  // 8. Analytics & Reporting
  // =========================================================================
  {
    key: "analytics:view_overview",
    category: "Analytics",
    description: "View dashboard summary charts, order counts, and conversion metrics",
  },
  {
    key: "analytics:view_financials",
    category: "Analytics",
    description: "View sensitive store revenue, profit margins, and sales totals",
  },

  // =========================================================================
  // 9. Store Settings
  // =========================================================================
  {
    key: "settings:view",
    category: "Settings",
    description: "View general store preferences, tax rules, and profile info",
  },
  {
    key: "settings:manage",
    category: "Settings",
    description: "Update store identity, payment gateways, and system configurations",
  },

  // =========================================================================
  // 10. Staff Management & Access Control
  // =========================================================================
  {
    key: "staff:view",
    category: "Staff Management",
    description: "View store staff accounts and assigned roles",
  },
  {
    key: "staff:manage",
    category: "Staff Management",
    description: "Assign roles, modify permissions, and invite or remove staff members",
  },
] as const;

export type AppPermission = (typeof PERMISSIONS_CATALOG)[number]["key"];

/**
 * Pre-configured default permission sets for store roles
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, AppPermission[]> = {
  "Store Manager": [
    "products:view",
    "products:create",
    "products:edit",
    "products:delete",
    "orders:view",
    "orders:update_status",
    "orders:cancel",
    "orders:export",
    "coupons:view",
    "coupons:manage",
    "delivery:view",
    "delivery:manage",
    "cms:view",
    "cms:manage",
    "support:view",
    "support:reply",
    "customers:view",
    "customers:edit",
    "customers:manage_status",
    "analytics:view_overview",
    "analytics:view_financials",
    "settings:view",
    "staff:view",
  ],
  "Order Fulfillment": [
    "orders:view",
    "orders:update_status",
    "orders:cancel",
    "orders:export",
    "delivery:view",
    "products:view",
    "customers:view",
  ],
  "Inventory Specialist": [
    "products:view",
    "products:create",
    "products:edit",
    "products:delete",
    "orders:view",
  ],
  "Customer Support": [
    "support:view",
    "support:reply",
    "orders:view",
    "products:view",
    "customers:view",
    "customers:edit",
  ],
};
