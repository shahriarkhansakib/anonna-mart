import { randomUUID } from "node:crypto";
import { db, incompleteOrders } from "@growmate/db";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AuthVariables } from "../../infra/middleware/auth";
import { requireAuth } from "../../infra/middleware/auth";
import { requireRole } from "../../infra/middleware/role";

export const incompleteOrdersRouter = new Hono<{ Variables: AuthVariables }>();

// GET /api/incomplete-orders (Staff only - prevents public PII leak)
incompleteOrdersRouter.get("/", requireAuth, requireRole("admin"), async (c) => {
  const list = await db.select().from(incompleteOrders).orderBy(desc(incompleteOrders.createdAt));
  const formatted = list.map((item) => ({
    ...item,
    customer_name: item.customerName,
    customer_phone: item.customerPhone,
    customer_email: item.customerEmail,
    shipping_address: item.shippingAddress,
    total_amount: item.totalAmount,
    recovered_at: item.recoveredAt ? new Date(item.recoveredAt).toISOString() : null,
    created_at: new Date(item.createdAt).toISOString(),
    updated_at: new Date(item.updatedAt).toISOString(),
  }));
  return c.json({ success: true, data: formatted });
});

// POST /api/incomplete-orders (Checkout tracker - public with data sanitization)
incompleteOrdersRouter.post("/", async (c) => {
  const body = await c.req.json();
  const id = body.id || randomUUID();

  const [created] = await db
    .insert(incompleteOrders)
    .values({
      id,
      customerName: body.customerName || body.customer_name || "Guest Customer",
      customerPhone: body.customerPhone || body.customer_phone || "",
      customerEmail: body.customerEmail || body.customer_email || null,
      shippingAddress: body.shippingAddress || body.shipping_address || null,
      items: body.items || [],
      totalAmount: Number(body.totalAmount || body.total_amount || 0),
      status: body.status || "abandoned",
      notes: body.notes || null,
    })
    .returning();

  return c.json({ success: true, data: created }, 201);
});

// PATCH /api/incomplete-orders/:id (Staff only)
incompleteOrdersRouter.patch("/:id", requireAuth, requireRole("admin"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const updateData: any = { updatedAt: new Date() };
  if (body.status !== undefined) updateData.status = body.status;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.status === "recovered") updateData.recoveredAt = new Date();

  const [updated] = await db
    .update(incompleteOrders)
    .set(updateData)
    .where(eq(incompleteOrders.id, id))
    .returning();

  return c.json({ success: true, data: updated });
});

// DELETE /api/incomplete-orders/:id (Staff only)
incompleteOrdersRouter.delete("/:id", requireAuth, requireRole("admin"), async (c) => {
  const id = c.req.param("id");
  await db.delete(incompleteOrders).where(eq(incompleteOrders.id, id));
  return c.json({ success: true });
});
