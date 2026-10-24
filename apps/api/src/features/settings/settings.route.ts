import { adminSettings, db } from "@growmate/db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AuthVariables } from "../../infra/middleware/auth";
import { requireAuth } from "../../infra/middleware/auth";
import { requirePermission } from "../../infra/middleware/require-permission";
import { requireRole } from "../../infra/middleware/role";
import { PermissionService } from "../permissions/permission.service";

export const settingsRouter = new Hono<{ Variables: AuthVariables }>();

// GET /api/settings (Public store info, sensitive connectors scrubbed for non-staff)
settingsRouter.get("/", async (c) => {
  const key = c.req.query("key");
  const [settings] = await db.select().from(adminSettings).where(eq(adminSettings.id, "default"));

  // Check if caller has staff access
  const user = c.get("user") as any;
  let isStaff = false;
  if (user) {
    if (user.role === "admin" || user.role === "super_admin") {
      isStaff = true;
    } else {
      const perms = await PermissionService.resolvePermissions(user.id);
      isStaff = perms.has("settings:view") || perms.has("*");
    }
  }

  if (key) {
    let val: any = null;
    if (key === "connectors") {
      val = isStaff ? settings?.connectors : null;
    } else if (key === "store_settings" || key === "store") {
      val = settings?.storeSettings;
    } else if (key === "shipping_settings" || key === "shipping_rules") {
      val = settings?.shippingSettings;
    } else if (key === "order_settings") {
      val = settings?.orderSettings;
    }
    return c.json({ success: true, data: { value: val || null } });
  }

  const defaultStoreSettings = {
    name: "GrowMate Pet Store",
    email: "support@growmate.pet",
    phone: "+8801700000000",
    address: "House 12, Road 4, Dhanmondi, Dhaka 1205",
    currency: "BDT",
    taxRate: 0,
    aboutText: "Premium pet care & wholesome nutrition across Bangladesh.",
  };

  const defaultShippingSettings = {
    defaultCharge: 60,
    freeShippingThreshold: 2000,
    enableFreeShipping: true,
    estimatedDeliveryDays: 2,
    courierName: "Steadfast",
  };

  const defaultOrderSettings = {
    minOrderAmount: 100,
    maxOrderAmount: 50000,
    autoCancelHours: 48,
    enableCOD: true,
    enableOnlinePayment: true,
    lowStockThreshold: 5,
    orderPrefix: "GM",
  };

  if (!settings) {
    return c.json({
      success: true,
      data: {
        storeSettings: defaultStoreSettings,
        shippingSettings: defaultShippingSettings,
        orderSettings: defaultOrderSettings,
      },
    });
  }

  return c.json({
    success: true,
    data: {
      storeSettings: settings.storeSettings || defaultStoreSettings,
      shippingSettings: settings.shippingSettings || defaultShippingSettings,
      orderSettings: settings.orderSettings || defaultOrderSettings,
      notificationSettings: isStaff ? settings.notificationSettings || {} : {},
      connectors: isStaff ? settings.connectors || {} : {},
      platformSettings: isStaff ? settings.platformSettings || {} : {},
    },
  });
});

// POST or PUT /api/settings (Admin / Staff with settings:manage permission)
settingsRouter.post("/", requireAuth, requirePermission("settings:manage"), async (c) => {
  const body = await c.req.json();

  if (body.key === "connectors") {
    body.connectors = body.value;
  } else if (body.key === "shipping_rules" || body.key === "shipping_settings") {
    body.shippingSettings = body.value;
  } else if (body.key === "brand_assets" || body.key === "store_settings") {
    body.storeSettings = body.value;
  } else if (body.key === "platform" || body.key === "platform_settings") {
    body.platformSettings = body.value;
  }

  const [existing] = await db.select().from(adminSettings).where(eq(adminSettings.id, "default"));

  if (existing) {
    const [updated] = await db
      .update(adminSettings)
      .set({
        storeSettings: body.storeSettings
          ? { ...(existing.storeSettings || {}), ...body.storeSettings }
          : existing.storeSettings,
        shippingSettings: body.shippingSettings
          ? { ...(existing.shippingSettings || {}), ...body.shippingSettings }
          : existing.shippingSettings,
        orderSettings: body.orderSettings
          ? { ...(existing.orderSettings || {}), ...body.orderSettings }
          : existing.orderSettings,
        notificationSettings: body.notificationSettings
          ? { ...(existing.notificationSettings || {}), ...body.notificationSettings }
          : existing.notificationSettings,
        connectors: body.connectors
          ? { ...(existing.connectors || {}), ...body.connectors }
          : existing.connectors,
        platformSettings: body.platformSettings
          ? { ...(existing.platformSettings || {}), ...body.platformSettings }
          : existing.platformSettings,
        updatedAt: new Date(),
      })
      .where(eq(adminSettings.id, "default"))
      .returning();

    return c.json({ success: true, data: updated });
  }

  const [created] = await db
    .insert(adminSettings)
    .values({
      id: "default",
      storeSettings: body.storeSettings || {},
      shippingSettings: body.shippingSettings || {},
      orderSettings: body.orderSettings || {},
      notificationSettings: body.notificationSettings || {},
      connectors: body.connectors || {},
      platformSettings: body.platformSettings || {},
    })
    .returning();

  return c.json({ success: true, data: created });
});
