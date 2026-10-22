import { randomUUID } from "node:crypto";
import { db, deliveryZones } from "@growmate/db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { requireAuth } from "../../infra/middleware/auth";
import { requirePermission } from "../../infra/middleware/require-permission";

export const deliveryZonesRouter = new Hono();

function formatZone(z: any) {
  if (!z) return z;
  return {
    ...z,
    zone_name: z.name,
    charge: z.standardFee,
    delivery_fee: z.standardFee,
    estimated_days: z.estimatedDays || `${Math.ceil((z.estimatedDeliveryHours || 24) / 24)}-${Math.ceil((z.estimatedDeliveryHours || 24) / 24) + 2} days`,
    is_active: z.isActive,
    divisions: Array.isArray(z.divisions) ? z.divisions : [],
    created_at: z.createdAt ? new Date(z.createdAt).toISOString() : new Date().toISOString(),
    updated_at: z.updatedAt ? new Date(z.updatedAt).toISOString() : new Date().toISOString(),
  };
}

// GET /api/delivery-zones (Public for checkout calculations)
deliveryZonesRouter.get("/", async (c) => {
  const zones = await db.select().from(deliveryZones);
  return c.json({ success: true, data: zones.map(formatZone) });
});

// POST /api/delivery-zones
deliveryZonesRouter.post("/", requireAuth, requirePermission("delivery:manage"), async (c) => {
  const body = await c.req.json();
  const id = body.id || randomUUID();
  const name = body.zone_name || body.name || "Delivery Zone";
  const standardFee = Number(body.charge !== undefined ? body.charge : body.delivery_fee !== undefined ? body.delivery_fee : body.standardFee || 60);

  const [zone] = await db
    .insert(deliveryZones)
    .values({
      id,
      name,
      district: body.district || name,
      standardFee,
      estimatedDeliveryHours: Number(body.estimatedDeliveryHours || 24),
      estimatedDays: body.estimated_days || body.estimatedDays || "2-4 days",
      divisions: Array.isArray(body.divisions) ? body.divisions : [],
      steadfastCityId: body.steadfastCityId,
      steadfastZoneId: body.steadfastZoneId,
      isActive: body.is_active !== undefined ? !!body.is_active : body.isActive !== false,
    })
    .returning();

  return c.json({ success: true, data: formatZone(zone) }, 201);
});

// PATCH /api/delivery-zones/:id
deliveryZonesRouter.patch("/:id", requireAuth, requirePermission("delivery:manage"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (body.zone_name !== undefined || body.name !== undefined) {
    updateData.name = body.zone_name || body.name;
  }
  if (body.district !== undefined) updateData.district = body.district;
  if (body.charge !== undefined || body.delivery_fee !== undefined || body.standardFee !== undefined) {
    updateData.standardFee = Number(body.charge !== undefined ? body.charge : body.delivery_fee !== undefined ? body.delivery_fee : body.standardFee);
  }
  if (body.estimated_days !== undefined || body.estimatedDays !== undefined) {
    updateData.estimatedDays = body.estimated_days || body.estimatedDays;
  }
  if (body.divisions !== undefined && Array.isArray(body.divisions)) {
    updateData.divisions = body.divisions;
  }
  if (body.is_active !== undefined || body.isActive !== undefined) {
    updateData.isActive = body.is_active !== undefined ? !!body.is_active : !!body.isActive;
  }

  const [updated] = await db
    .update(deliveryZones)
    .set(updateData)
    .where(eq(deliveryZones.id, id))
    .returning();

  return c.json({ success: true, data: formatZone(updated) });
});

// DELETE /api/delivery-zones/:id
deliveryZonesRouter.delete("/:id", requireAuth, requirePermission("delivery:manage"), async (c) => {
  const id = c.req.param("id");
  await db.delete(deliveryZones).where(eq(deliveryZones.id, id));
  return c.json({ success: true, message: "Delivery zone deleted" });
});
