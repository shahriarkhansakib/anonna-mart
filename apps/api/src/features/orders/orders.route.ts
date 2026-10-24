import { randomUUID } from "node:crypto";
import { db, orderItems, orders, orderStatusHistory, users } from "@growmate/db";
import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { Hono } from "hono";
import { auth } from "../../infra/lib/auth";
import { requireAuth } from "../../infra/middleware/auth";
import { requirePermission } from "../../infra/middleware/require-permission";
import { bookSteadfastOrder, trackSteadfastConsignment } from "../courier/steadfast.service";
import { PermissionService } from "../permissions/permission.service";

export const ordersRouter = new Hono();

// Helper to format an order with full compatibility for Admin views
function formatOrder(order: any, items: any[] = [], user: any = null) {
  if (!order) return order;

  const profile = user
    ? {
        full_name: user.name || null,
        phone: user.phone || null,
        avatar_url: user.avatarUrl || user.image || null,
      }
    : {
        full_name: order.customerName || null,
        phone: order.customerPhone || null,
      };

  const formattedItems = (items || []).map((item) => ({
    id: item.productId || item.id,
    name: item.productName || item.name,
    product_name: item.productName || item.name,
    quantity: item.quantity,
    price: item.unitPrice,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
  }));

  return {
    ...order,
    // snake_case compatibility for Admin views
    user_id: order.userId,
    customer_name: order.customerName,
    customer_email: order.customerEmail,
    customer_phone: order.customerPhone,
    shipping_address: order.shippingAddress,
    total_amount: order.totalAmount,
    subtotal: order.subtotal,
    shipping_fee: order.shippingFee,
    discount_amount: order.discountAmount,
    payment_method: order.paymentMethod,
    payment_status: order.paymentStatus,
    tracking_id: order.trackingCode || null,
    tracking_code: order.trackingCode || null,
    courier_name: order.courierName || null,
    tracking_url: order.trackingUrl || null,
    consignment_id: order.consignmentId || null,
    rejection_reason: order.rejectionReason || null,
    trashed_at: order.trashedAt ? new Date(order.trashedAt).toISOString() : null,
    created_at: order.createdAt
      ? new Date(order.createdAt).toISOString()
      : new Date().toISOString(),
    updated_at: order.updatedAt
      ? new Date(order.updatedAt).toISOString()
      : new Date().toISOString(),
    items: formattedItems,
    profile,
  };
}

// Helper to record an immutable status transition in the audit log
async function logStatusTransition(
  orderId: string,
  fromStatus: any,
  toStatus: any,
  changedBy?: string | null,
  reason?: string | null,
  metadata?: Record<string, any>,
) {
  try {
    await db.insert(orderStatusHistory).values({
      id: randomUUID(),
      orderId,
      fromStatus: fromStatus || null,
      toStatus,
      changedBy: changedBy || null,
      reason: reason || null,
      metadata: metadata || null,
    });
  } catch (err) {
    console.error("Failed to record order status transition audit log:", err);
  }
}

// GET /api/orders (Server-side SQL pagination, filtering and search)
ordersRouter.get("/", requireAuth, async (c) => {
  const user = c.get("user") as any;
  const userPerms = await PermissionService.resolvePermissions(user.id);
  const canViewAll =
    user.role === "admin" ||
    user.role === "super_admin" ||
    userPerms.has("orders:view") ||
    userPerms.has("*");

  const status = c.req.query("status");
  const search = c.req.query("search");
  const time = c.req.query("time");
  const rawPage = Number(c.req.query("page")) || 1;
  const rawPageSize = Number(c.req.query("pageSize") || c.req.query("limit")) || 25;

  const page = Math.max(1, rawPage);
  const pageSize = Math.min(100, Math.max(1, rawPageSize));

  const conditions: SQL[] = [];

  // If customer without staff orders:view permission, restrict to own orders only
  if (!canViewAll) {
    conditions.push(eq(orders.userId, user.id));
  }

  // Filter out trashed by default unless explicitly requested
  if (status === "trashed") {
    conditions.push(isNotNull(orders.trashedAt));
  } else {
    conditions.push(isNull(orders.trashedAt));
    if (status && status !== "all" && status !== "flagged") {
      conditions.push(eq(orders.status, status as any));
    }
  }

  // Search filter
  if (search && search.trim()) {
    const q = `%${search.trim().toLowerCase()}%`;
    conditions.push(
      or(
        ilike(orders.orderNumber, q),
        ilike(orders.customerName, q),
        ilike(orders.customerPhone, q),
        ilike(orders.customerEmail, q),
        ilike(orders.trackingCode, q),
      )!,
    );
  }

  // Time cutoff filter
  if (time && time !== "all") {
    const now = Date.now();
    let cutoffMs = 0;
    if (time === "today") cutoffMs = 24 * 60 * 60 * 1000;
    else if (time === "7days") cutoffMs = 7 * 24 * 60 * 60 * 1000;
    else if (time === "30days") cutoffMs = 30 * 24 * 60 * 60 * 1000;
    else if (time === "90days") cutoffMs = 90 * 24 * 60 * 60 * 1000;

    if (cutoffMs > 0) {
      const cutoffDate = new Date(now - cutoffMs);
      conditions.push(gte(orders.createdAt, cutoffDate));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // 1. Efficient total count query
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(whereClause);
  const totalCount = Number(countResult?.count || 0);

  // 2. Paginated orders query using SQL limit and offset
  const offset = (page - 1) * pageSize;
  const pagedOrders = await db
    .select()
    .from(orders)
    .where(whereClause)
    .orderBy(desc(orders.createdAt))
    .limit(pageSize)
    .offset(offset);

  // 3. Batch query only the items and users belonging to the paginated slice
  const orderIds = pagedOrders.map((o) => o.id);
  const userIds = Array.from(new Set(pagedOrders.map((o) => o.userId).filter(Boolean))) as string[];

  const orderItemsList =
    orderIds.length > 0
      ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
      : [];

  const matchedUsers =
    userIds.length > 0 ? await db.select().from(users).where(inArray(users.id, userIds)) : [];

  const itemsByOrderId = new Map<string, any[]>();
  for (const item of orderItemsList) {
    const existing = itemsByOrderId.get(item.orderId) || [];
    existing.push(item);
    itemsByOrderId.set(item.orderId, existing);
  }

  const userMap = new Map(matchedUsers.map((u) => [u.id, u]));

  const formatted = pagedOrders.map((o) =>
    formatOrder(o, itemsByOrderId.get(o.id) || [], o.userId ? userMap.get(o.userId) : null),
  );

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return c.json({
    success: true,
    data: formatted,
    orders: formatted,
    totalCount,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

// GET /api/orders/:id
ordersRouter.get("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const user = c.get("user") as any;

  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) {
    return c.json({ success: false, error: "Order not found" }, 404);
  }

  // Check access: customer owns order or staff has orders:view
  if (order.userId !== user.id && user.role !== "admin" && user.role !== "super_admin") {
    const userPerms = await PermissionService.resolvePermissions(user.id);
    if (!userPerms.has("orders:view") && !userPerms.has("*")) {
      return c.json({ success: false, error: "Access denied to this order" }, 403);
    }
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  const [orderCustomer] = order.userId
    ? await db.select().from(users).where(eq(users.id, order.userId))
    : [null];

  return c.json({ success: true, data: formatOrder(order, items, orderCustomer) });
});

// GET /api/orders/:id/history (Status transition audit trail)
ordersRouter.get("/:id/history", requireAuth, async (c) => {
  const id = c.req.param("id");
  const user = c.get("user") as any;

  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) {
    return c.json({ success: false, error: "Order not found" }, 404);
  }

  // Access check
  if (order.userId !== user.id && user.role !== "admin" && user.role !== "super_admin") {
    const userPerms = await PermissionService.resolvePermissions(user.id);
    if (!userPerms.has("orders:view") && !userPerms.has("*")) {
      return c.json({ success: false, error: "Access denied to order history" }, 403);
    }
  }

  const historyEntries = await db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, id))
    .orderBy(desc(orderStatusHistory.createdAt));

  const changerIds = Array.from(
    new Set(historyEntries.map((h) => h.changedBy).filter(Boolean)),
  ) as string[];

  const changers =
    changerIds.length > 0 ? await db.select().from(users).where(inArray(users.id, changerIds)) : [];

  const changerMap = new Map<string, any>(changers.map((u) => [u.id, u]));

  const formattedHistory = historyEntries.map((h) => {
    const changer = h.changedBy ? changerMap.get(h.changedBy) : null;
    return {
      id: h.id,
      orderId: h.orderId,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      reason: h.reason,
      metadata: h.metadata,
      createdAt: h.createdAt.toISOString(),
      changedBy: changer
        ? {
            id: changer.id,
            name: changer.name,
            email: changer.email,
            role: changer.role,
          }
        : null,
    };
  });

  return c.json({ success: true, data: formattedHistory });
});

// POST /api/orders/:id/courier/steadfast (Direct Steadfast courier booking)
ordersRouter.post(
  "/:id/courier/steadfast",
  requireAuth,
  requirePermission("orders:update_status"),
  async (c) => {
    const id = c.req.param("id");
    const user = c.get("user") as any;
    const body = await c.req.json().catch(() => ({}));

    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) {
      return c.json({ success: false, error: "Order not found" }, 404);
    }

    const codAmount =
      body.cod_amount !== undefined
        ? Number(body.cod_amount)
        : order.paymentMethod === "cod"
          ? order.totalAmount
          : 0;

    const steadfastPayload = {
      invoice: order.orderNumber || order.id,
      recipient_name: body.recipient_name || order.customerName,
      recipient_phone: body.recipient_phone || order.customerPhone,
      recipient_address: body.recipient_address || order.shippingAddress,
      cod_amount: codAmount,
      note: body.note || `Order #${order.orderNumber} via Anonna Mart`,
    };

    const courierResult = await bookSteadfastOrder(steadfastPayload);

    if (!courierResult.success || !courierResult.consignment) {
      return c.json(
        { success: false, error: courierResult.message || "Courier booking failed" },
        400,
      );
    }

    const trackingCode = courierResult.consignment.tracking_code;
    const consignmentId = String(courierResult.consignment.consignment_id);
    const trackingUrl = `https://steadfast.com.bd/t/${trackingCode}`;

    const [updated] = await db
      .update(orders)
      .set({
        status: "processing",
        courierName: "Steadfast",
        trackingCode,
        consignmentId,
        trackingUrl,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    // Log the courier consignment booking transition
    await logStatusTransition(
      id,
      order.status,
      "processing",
      user.id,
      `Consignment booked with Steadfast (Tracking: ${trackingCode})`,
      {
        consignment_id: consignmentId,
        tracking_code: trackingCode,
        simulated: courierResult.simulated,
      },
    );

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    return c.json({
      success: true,
      message: courierResult.message,
      consignment: courierResult.consignment,
      data: formatOrder(updated, items),
    });
  },
);

// GET /api/orders/:id/courier/tracking (Live Steadfast consignment tracking status)
ordersRouter.get("/:id/courier/tracking", requireAuth, async (c) => {
  const id = c.req.param("id");
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) {
    return c.json({ success: false, error: "Order not found" }, 404);
  }

  const trackingKey = order.trackingCode || order.consignmentId;
  if (!trackingKey) {
    return c.json(
      {
        success: false,
        error: "No courier tracking code or consignment ID attached to this order",
      },
      400,
    );
  }

  const trackingResult = await trackSteadfastConsignment(trackingKey);
  return c.json(trackingResult);
});

// POST /api/orders (Public or Authenticated Customer Checkout)
ordersRouter.post("/", async (c) => {
  const body = await c.req.json();
  const id = body.id || randomUUID();
  const orderNumber =
    body.orderNumber || body.order_number || `AM-${Math.floor(1000 + Math.random() * 9000)}`;

  // Automatically link to active authenticated user session if present
  let resolvedUserId = body.userId || body.user_id || null;
  if (!resolvedUserId) {
    try {
      const activeSession = await auth.api.getSession({ headers: c.req.raw.headers });
      if (activeSession?.user?.id) {
        resolvedUserId = activeSession.user.id;
      }
    } catch {}
  }

  const subtotal = Number(body.subtotal || body.total_amount || 0);
  const shippingFee = Number(body.shippingFee || body.shipping_fee || 60);
  const discountAmount = Number(body.discountAmount || body.discount_amount || 0);
  const totalAmount = Number(
    body.totalAmount || body.total_amount || subtotal + shippingFee - discountAmount,
  );

  const [newOrder] = await db
    .insert(orders)
    .values({
      id,
      orderNumber,
      userId: resolvedUserId,
      customerName: body.customerName || body.customer_name || "Customer",
      customerEmail: body.customerEmail || body.customer_email || "customer@example.com",
      customerPhone: body.customerPhone || body.customer_phone || "01700000000",
      shippingAddress: body.shippingAddress || body.shipping_address || "Dhaka, Bangladesh",
      deliveryZoneId: body.deliveryZoneId || body.delivery_zone_id || null,
      subtotal,
      shippingFee,
      discountAmount,
      totalAmount,
      status: body.status || "pending",
      paymentStatus:
        body.paymentMethod === "online" || body.payment_method === "online" ? "paid" : "pending",
      paymentMethod: body.paymentMethod || body.payment_method || "cod",
      notes: body.notes || null,
    })
    .returning();

  const itemsToInsert = body.items || [];
  if (Array.isArray(itemsToInsert) && itemsToInsert.length > 0) {
    for (const item of itemsToInsert) {
      await db.insert(orderItems).values({
        id: randomUUID(),
        orderId: id,
        productId: item.productId || item.id || "prod-default",
        productName: item.productName || item.name || "Product",
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || item.price || 0),
        totalPrice: Number(item.quantity || 1) * Number(item.unitPrice || item.price || 0),
      });
    }
  }

  // Record initial order creation in status history
  await logStatusTransition(
    id,
    null,
    newOrder.status,
    resolvedUserId,
    "Order placed via storefront checkout",
  );

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  return c.json({ success: true, data: formatOrder(newOrder, items) }, 201);
});

// POST /api/orders/:id/accept
ordersRouter.post(
  "/:id/accept",
  requireAuth,
  requirePermission("orders:update_status"),
  async (c) => {
    const id = c.req.param("id");
    const user = c.get("user") as any;
    const body = await c.req.json().catch(() => ({}));

    const [existing] = await db.select().from(orders).where(eq(orders.id, id));
    if (!existing) {
      return c.json({ success: false, error: "Order not found" }, 404);
    }

    const [updated] = await db
      .update(orders)
      .set({
        status: "processing",
        trackingCode: body.trackingId || body.tracking_id || existing.trackingCode || null,
        consignmentId: body.consignmentId || body.consignment_id || existing.consignmentId || null,
        courierName: body.courierName || body.courier_name || existing.courierName || "Steadfast",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    await logStatusTransition(
      id,
      existing.status,
      "processing",
      user.id,
      "Order confirmed and accepted by staff",
      { trackingId: updated.trackingCode, consignmentId: updated.consignmentId },
    );

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    return c.json({ success: true, data: formatOrder(updated, items) });
  },
);

// POST /api/orders/:id/reject
ordersRouter.post("/:id/reject", requireAuth, requirePermission("orders:cancel"), async (c) => {
  const id = c.req.param("id");
  const user = c.get("user") as any;
  const body = await c.req.json().catch(() => ({}));

  const [existing] = await db.select().from(orders).where(eq(orders.id, id));
  if (!existing) {
    return c.json({ success: false, error: "Order not found" }, 404);
  }

  const reason = body.reason || body.rejection_reason || "Declined by store admin";

  const [updated] = await db
    .update(orders)
    .set({
      status: "rejected",
      rejectionReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, id))
    .returning();

  await logStatusTransition(id, existing.status, "rejected", user.id, reason);

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  return c.json({ success: true, data: formatOrder(updated, items) });
});

// POST /api/orders/bulk-status
ordersRouter.post(
  "/bulk-status",
  requireAuth,
  requirePermission("orders:update_status"),
  async (c) => {
    const user = c.get("user") as any;
    const { ids, status } = await c.req.json();

    if (!Array.isArray(ids) || !status) {
      return c.json({ success: false, error: "Invalid parameters" }, 400);
    }

    for (const id of ids) {
      const [existing] = await db
        .select({ status: orders.status })
        .from(orders)
        .where(eq(orders.id, id));
      if (existing) {
        await db
          .update(orders)
          .set({
            status,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, id));

        await logStatusTransition(id, existing.status, status, user.id, "Bulk status update");
      }
    }

    return c.json({ success: true, count: ids.length });
  },
);

// PATCH /api/orders/:id/trash (soft-delete or restore)
ordersRouter.patch("/:id/trash", requireAuth, requirePermission("orders:cancel"), async (c) => {
  const id = c.req.param("id");
  const user = c.get("user") as any;
  const body = await c.req.json().catch(() => ({}));
  const restore = body.restore === true;

  const [existing] = await db.select().from(orders).where(eq(orders.id, id));
  if (!existing) {
    return c.json({ success: false, error: "Order not found" }, 404);
  }

  const [updated] = await db
    .update(orders)
    .set({
      trashedAt: restore ? null : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, id))
    .returning();

  await logStatusTransition(
    id,
    existing.status,
    existing.status,
    user.id,
    restore ? "Order restored from trash" : "Order moved to trash",
  );

  return c.json({ success: true, data: formatOrder(updated) });
});

// PATCH /api/orders/:id (general update)
ordersRouter.patch("/:id", requireAuth, requirePermission("orders:update_status"), async (c) => {
  const id = c.req.param("id");
  const user = c.get("user") as any;
  const body = await c.req.json();

  const [existing] = await db.select().from(orders).where(eq(orders.id, id));
  if (!existing) {
    return c.json({ success: false, error: "Order not found" }, 404);
  }

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (body.status !== undefined) updateData.status = body.status;
  if (body.tracking_id !== undefined || body.trackingCode !== undefined) {
    updateData.trackingCode = body.tracking_id || body.trackingCode;
  }
  if (body.consignment_id !== undefined || body.consignmentId !== undefined) {
    updateData.consignmentId = body.consignment_id || body.consignmentId;
  }
  if (body.courier_name !== undefined || body.courierName !== undefined) {
    updateData.courierName = body.courier_name || body.courierName;
  }
  if (body.rejection_reason !== undefined || body.rejectionReason !== undefined) {
    updateData.rejectionReason = body.rejection_reason || body.rejectionReason;
  }
  if (body.notes !== undefined) updateData.notes = body.notes;

  const [updated] = await db.update(orders).set(updateData).where(eq(orders.id, id)).returning();

  if (body.status && body.status !== existing.status) {
    await logStatusTransition(
      id,
      existing.status,
      body.status,
      user.id,
      body.rejection_reason || body.rejectionReason || "Status updated via order edit",
      {
        trackingCode: updated.trackingCode,
        consignmentId: updated.consignmentId,
      },
    );
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  return c.json({ success: true, data: formatOrder(updated, items) });
});

// DELETE /api/orders/:id (permanent delete)
ordersRouter.delete("/:id", requireAuth, requirePermission("orders:delete"), async (c) => {
  const id = c.req.param("id");
  await db.delete(orders).where(eq(orders.id, id));
  return c.json({ success: true, message: "Order permanently deleted" });
});
