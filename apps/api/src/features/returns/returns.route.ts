import { randomUUID } from "node:crypto";
import {
  db,
  orderReturns,
  orders,
  productVariants,
  products,
  storeCredits,
  users,
} from "@growmate/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { AuthVariables } from "../../infra/middleware/auth";
import { requireAuth } from "../../infra/middleware/auth";
import { requireRole } from "../../infra/middleware/role";

export const returnsRouter = new Hono<{ Variables: AuthVariables }>();

// All return routes require authentication
returnsRouter.use("/*", requireAuth);

function formatReturn(r: any, customer?: any, order?: any) {
  if (!r) return r;
  return {
    ...r,
    id: r.id,
    order_id: r.orderId,
    customer_user_id: r.customerUserId,
    kind: r.kind || "return",
    status: r.status || "requested",
    reason: r.reason,
    items: Array.isArray(r.items) ? r.items : [],
    refund_amount: Number(r.refundAmount || 0),
    refund_method: r.refundMethod || "original",
    restock: !!r.restock,
    restocked: !!r.restocked,
    notes: r.notes || null,
    created_at: new Date(r.createdAt).toISOString(),
    updated_at: new Date(r.updatedAt).toISOString(),
    customer: customer
      ? {
          id: customer.id,
          name: customer.name,
          full_name: customer.name,
          email: customer.email,
          phone: customer.phone,
          avatar_url: customer.avatarUrl || customer.image,
        }
      : null,
    order: order
      ? {
          id: order.id,
          status: order.status,
          total_amount: order.totalAmount,
          payment_status: order.paymentStatus,
          payment_method: order.paymentMethod,
          shipping_address: order.shippingAddress,
        }
      : null,
  };
}

// GET /api/returns (Staff view all with pagination, search, & stats; Customers view only their own)
returnsRouter.get("/", async (c) => {
  const authUser = c.get("user") as any;
  const isStaff = authUser.role === "admin" || authUser.role === "super_admin";

  const page = Math.max(1, Number(c.req.query("page") || 1));
  const limit = Math.min(
    100,
    Math.max(1, Number(c.req.query("limit") || c.req.query("pageSize") || 25)),
  );
  const offset = (page - 1) * limit;
  const statusFilter = (c.req.query("status") || "all").toLowerCase();
  const search = (c.req.query("search") || c.req.query("q") || "").trim().toLowerCase();

  // 1. Fetch returns
  let allReturns: any[];
  if (isStaff) {
    allReturns = await db.select().from(orderReturns).orderBy(desc(orderReturns.createdAt));
  } else {
    allReturns = await db
      .select()
      .from(orderReturns)
      .where(eq(orderReturns.customerUserId, authUser.id))
      .orderBy(desc(orderReturns.createdAt));
  }

  // 2. Fetch associated users and orders to enrich in-memory lookup map
  const userIds = Array.from(
    new Set(allReturns.map((r) => r.customerUserId).filter(Boolean)),
  ) as string[];
  const orderIds = Array.from(
    new Set(allReturns.map((r) => r.orderId).filter(Boolean)),
  ) as string[];

  const userMap = new Map<string, any>();
  if (userIds.length > 0) {
    const userRecords = await db.select().from(users);
    for (const u of userRecords) userMap.set(u.id, u);
  }

  const orderMap = new Map<string, any>();
  if (orderIds.length > 0) {
    const orderRecords = await db.select().from(orders);
    for (const o of orderRecords) orderMap.set(o.id, o);
  }

  // 3. Calculate summary stats
  const stats = {
    pending: allReturns.filter((r) => r.status === "requested").length,
    awaiting: allReturns.filter((r) => r.status === "approved").length,
    received: allReturns.filter((r) => r.status === "received").length,
    completed: allReturns.filter((r) => r.status === "completed").length,
    exchanges: allReturns.filter((r) => r.kind === "exchange" && r.status !== "rejected").length,
    refunded: allReturns
      .filter((r) => r.status === "completed")
      .reduce((s, r) => s + Number(r.refundAmount || 0), 0),
  };

  // 4. Map and enrich
  let enriched = allReturns.map((r) =>
    formatReturn(r, userMap.get(r.customerUserId), orderMap.get(r.orderId)),
  );

  // 5. Filter by status
  if (statusFilter !== "all") {
    enriched = enriched.filter((r) => r.status === statusFilter);
  }

  // 6. Filter by search (order ID, customer name, email, phone)
  if (search) {
    enriched = enriched.filter((r) => {
      const orderMatch = r.order_id?.toLowerCase().includes(search.replace("#", ""));
      const nameMatch = r.customer?.name?.toLowerCase().includes(search);
      const emailMatch = r.customer?.email?.toLowerCase().includes(search);
      const phoneMatch = r.customer?.phone?.includes(search);
      return orderMatch || nameMatch || emailMatch || phoneMatch;
    });
  }

  const totalCount = enriched.length;
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const paginatedData = enriched.slice(offset, offset + limit);

  return c.json({
    success: true,
    data: paginatedData,
    stats,
    pagination: {
      page,
      pageSize: limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

// GET /api/returns/:id
returnsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const authUser = c.get("user") as any;
  const isStaff = authUser.role === "admin" || authUser.role === "super_admin";

  const [returnRecord] = await db.select().from(orderReturns).where(eq(orderReturns.id, id));
  if (!returnRecord) {
    return c.json({ success: false, error: "Return request not found" }, 404);
  }

  if (!isStaff && returnRecord.customerUserId !== authUser.id) {
    return c.json({ success: false, error: "Access denied" }, 403);
  }

  let customer = null;
  if (returnRecord.customerUserId) {
    const [u] = await db.select().from(users).where(eq(users.id, returnRecord.customerUserId));
    customer = u;
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, returnRecord.orderId));

  return c.json({
    success: true,
    data: formatReturn(returnRecord, customer, order),
  });
});

// POST /api/returns (Customer or Staff initiates a return)
returnsRouter.post("/", async (c) => {
  const authUser = c.get("user") as any;
  const isStaff = authUser.role === "admin" || authUser.role === "super_admin";
  const body = await c.req.json();
  const id = body.id || `ret-${Date.now()}-${randomUUID().slice(0, 8)}`;

  const orderId = body.orderId || body.order_id;
  if (!orderId) {
    return c.json({ success: false, error: "Order ID is required" }, 400);
  }

  const [existingOrder] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!existingOrder) {
    return c.json({ success: false, error: "Associated order not found" }, 404);
  }

  const customerUserId = isStaff
    ? body.customerUserId || body.customer_user_id || existingOrder.userId || authUser.id
    : authUser.id;

  const [created] = await db
    .insert(orderReturns)
    .values({
      id,
      orderId,
      customerUserId,
      kind: body.kind || "return",
      status: body.status || "requested",
      reason: body.reason || "Customer request",
      items: body.items || [],
      refundAmount: Number(body.refundAmount || body.refund_amount || 0),
      refundMethod: body.refundMethod || body.refund_method || "original",
      restock: body.restock !== undefined ? !!body.restock : true,
      restocked: false,
      notes: body.notes || null,
    })
    .returning();

  return c.json({ success: true, data: formatReturn(created) }, 201);
});

// PATCH /api/returns/:id (Staff advance return lifecycle with atomic restocking & wallet refunds)
returnsRouter.patch("/:id", requireRole("admin"), async (c) => {
  const id = c.req.param("id");
  const authUser = c.get("user") as any;
  const body = await c.req.json();

  const [existing] = await db.select().from(orderReturns).where(eq(orderReturns.id, id));
  if (!existing) {
    return c.json({ success: false, error: "Return request not found" }, 404);
  }

  const targetStatus = body.status !== undefined ? body.status : existing.status;
  const shouldRestock =
    targetStatus === "received" &&
    existing.restock &&
    !existing.restocked &&
    body.restocked !== false;

  const updateData: any = { updatedAt: new Date() };
  if (body.status !== undefined) updateData.status = body.status;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.restock !== undefined) updateData.restock = !!body.restock;
  if (body.refund_amount !== undefined || body.refundAmount !== undefined) {
    updateData.refundAmount = Number(
      body.refund_amount !== undefined ? body.refund_amount : body.refundAmount,
    );
  }
  if (body.refund_method !== undefined || body.refundMethod !== undefined) {
    updateData.refundMethod = body.refund_method || body.refundMethod;
  }

  // 1. ATOMIC INVENTORY RESTOCKING when item is marked "received"
  if (shouldRestock) {
    const items = Array.isArray(existing.items) ? existing.items : [];
    for (const item of items) {
      const productId = item.product_id || item.productId;
      const variantId = item.variant_id || item.variantId;
      const quantity = Math.max(1, Number(item.quantity || 1));

      if (productId) {
        // Increment product stock
        await db
          .update(products)
          .set({
            stockQuantity: sql`${products.stockQuantity} + ${quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(products.id, productId));

        // Increment variant stock if variant return
        if (variantId) {
          await db
            .update(productVariants)
            .set({
              stockQuantity: sql`${productVariants.stockQuantity} + ${quantity}`,
              updatedAt: new Date(),
            })
            .where(
              and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)),
            );
        }
      }
    }
    updateData.restocked = true;
  }

  // 2. ATOMIC STORE CREDIT REFUND when status is transitioned to "completed"
  const isCompleting = targetStatus === "completed" && existing.status !== "completed";
  const refundMethod = updateData.refundMethod || existing.refundMethod;
  const refundAmount =
    updateData.refundAmount !== undefined ? updateData.refundAmount : existing.refundAmount;

  if (
    isCompleting &&
    refundMethod === "store_credit" &&
    refundAmount > 0 &&
    existing.customerUserId
  ) {
    const creditId = `cred-${Date.now()}-${randomUUID().slice(0, 8)}`;
    await db.insert(storeCredits).values({
      id: creditId,
      customerUserId: existing.customerUserId,
      amount: refundAmount,
      reason: `Refund for return #${existing.id.slice(0, 8).toUpperCase()} on order #${existing.orderId.slice(0, 8).toUpperCase()}`,
      createdBy: authUser.id,
    });
  }

  // 3. Update return record
  const [updated] = await db
    .update(orderReturns)
    .set(updateData)
    .where(eq(orderReturns.id, id))
    .returning();

  let customer = null;
  if (updated.customerUserId) {
    const [u] = await db.select().from(users).where(eq(users.id, updated.customerUserId));
    customer = u;
  }
  const [order] = await db.select().from(orders).where(eq(orders.id, updated.orderId));

  return c.json({
    success: true,
    data: formatReturn(updated, customer, order),
    restocked: updateData.restocked ?? existing.restocked,
  });
});

// POST /api/returns/:id/restock (Manual atomic restock trigger)
returnsRouter.post("/:id/restock", requireRole("admin"), async (c) => {
  const id = c.req.param("id");
  const [existing] = await db.select().from(orderReturns).where(eq(orderReturns.id, id));

  if (!existing) {
    return c.json({ success: false, error: "Return request not found" }, 404);
  }

  if (existing.restocked) {
    return c.json(
      { success: false, error: "Items for this return have already been restocked" },
      400,
    );
  }

  const items = Array.isArray(existing.items) ? existing.items : [];
  for (const item of items) {
    const productId = item.product_id || item.productId;
    const variantId = item.variant_id || item.variantId;
    const quantity = Math.max(1, Number(item.quantity || 1));

    if (productId) {
      await db
        .update(products)
        .set({
          stockQuantity: sql`${products.stockQuantity} + ${quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId));

      if (variantId) {
        await db
          .update(productVariants)
          .set({
            stockQuantity: sql`${productVariants.stockQuantity} + ${quantity}`,
            updatedAt: new Date(),
          })
          .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)));
      }
    }
  }

  const [updated] = await db
    .update(orderReturns)
    .set({ restocked: true, updatedAt: new Date() })
    .where(eq(orderReturns.id, id))
    .returning();

  return c.json({
    success: true,
    message: "Items successfully restocked into active inventory",
    data: formatReturn(updated),
  });
});

// DELETE /api/returns/:id (Staff delete a return record)
returnsRouter.delete("/:id", requireRole("admin"), async (c) => {
  const id = c.req.param("id");
  await db.delete(orderReturns).where(eq(orderReturns.id, id));
  return c.json({ success: true, message: "Return record deleted successfully" });
});
