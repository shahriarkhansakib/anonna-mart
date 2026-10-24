import { randomUUID } from "node:crypto";
import { db, orderReturns, orders } from "@growmate/db";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AuthVariables } from "../../infra/middleware/auth";
import { requireAuth } from "../../infra/middleware/auth";
import { requireRole } from "../../infra/middleware/role";

export const returnsRouter = new Hono<{ Variables: AuthVariables }>();

// All return routes require authentication
returnsRouter.use("/*", requireAuth);

function formatReturn(r: any) {
  if (!r) return r;
  return {
    ...r,
    order_id: r.orderId,
    customer_user_id: r.customerUserId,
    refund_amount: r.refundAmount,
    refund_method: r.refundMethod,
    created_at: new Date(r.createdAt).toISOString(),
    updated_at: new Date(r.updatedAt).toISOString(),
  };
}

// GET /api/returns (Staff view all; Customers view only their own)
returnsRouter.get("/", async (c) => {
  const authUser = c.get("user") as any;
  const isStaff = authUser.role === "admin" || authUser.role === "super_admin";

  let list: any[];
  if (isStaff) {
    list = await db.select().from(orderReturns).orderBy(desc(orderReturns.createdAt));
  } else {
    list = await db
      .select()
      .from(orderReturns)
      .where(eq(orderReturns.customerUserId, authUser.id))
      .orderBy(desc(orderReturns.createdAt));
  }

  return c.json({ success: true, data: list.map(formatReturn) });
});

// POST /api/returns (Customer or Staff initiates a return)
returnsRouter.post("/", async (c) => {
  const authUser = c.get("user") as any;
  const isStaff = authUser.role === "admin" || authUser.role === "super_admin";
  const body = await c.req.json();
  const id = body.id || randomUUID();

  const customerUserId = isStaff
    ? body.customerUserId || body.customer_user_id || authUser.id
    : authUser.id;

  const [created] = await db
    .insert(orderReturns)
    .values({
      id,
      orderId: body.orderId || body.order_id,
      customerUserId,
      kind: body.kind || "return",
      status: body.status || "requested",
      reason: body.reason || "Customer request",
      items: body.items || [],
      refundAmount: Number(body.refundAmount || body.refund_amount || 0),
      refundMethod: body.refundMethod || body.refund_method || "original",
      restock: body.restock !== undefined ? !!body.restock : true,
      notes: body.notes || null,
    })
    .returning();

  return c.json({ success: true, data: formatReturn(created) }, 201);
});

// PATCH /api/returns/:id (Staff only advance or update return lifecycle)
returnsRouter.patch("/:id", requireRole("admin"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const updateData: any = { updatedAt: new Date() };
  if (body.status !== undefined) updateData.status = body.status;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.restocked !== undefined) updateData.restocked = !!body.restocked;
  if (body.refund_amount !== undefined || body.refundAmount !== undefined) {
    updateData.refundAmount = Number(
      body.refund_amount !== undefined ? body.refund_amount : body.refundAmount,
    );
  }

  const [updated] = await db
    .update(orderReturns)
    .set(updateData)
    .where(eq(orderReturns.id, id))
    .returning();

  return c.json({ success: true, data: formatReturn(updated) });
});
