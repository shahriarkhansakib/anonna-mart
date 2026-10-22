import { randomUUID } from "node:crypto";
import { db, orderItems, orders, users } from "@growmate/db";
import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { auth } from "../../infra/lib/auth";
import { requireAuth } from "../../infra/middleware/auth";
import { requirePermission } from "../../infra/middleware/require-permission";
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

// GET /api/orders
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

  let allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));

  // If customer without staff orders:view permission, restrict to own orders only
  if (!canViewAll) {
    allOrders = allOrders.filter((o) => o.userId === user.id);
  }

  // Filter out trashed by default unless explicitly requested
  if (status === "trashed") {
    allOrders = allOrders.filter((o) => !!o.trashedAt);
  } else {
    allOrders = allOrders.filter((o) => !o.trashedAt);
    if (status && status !== "all" && status !== "flagged") {
      allOrders = allOrders.filter((o) => o.status === status);
    }
  }

  // Search filter
  if (search) {
    const q = search.toLowerCase();
    allOrders = allOrders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q) ||
        (o.customerEmail && o.customerEmail.toLowerCase().includes(q)) ||
        (o.trackingCode && o.trackingCode.toLowerCase().includes(q)),
    );
  }

  // Time filter
  if (time && time !== "all") {
    const now = Date.now();
    let cutoff = 0;
    if (time === "today") cutoff = now - 24 * 60 * 60 * 1000;
    else if (time === "7days") cutoff = now - 7 * 24 * 60 * 60 * 1000;
    else if (time === "30days") cutoff = now - 30 * 24 * 60 * 60 * 1000;
    else if (time === "90days") cutoff = now - 90 * 24 * 60 * 60 * 1000;

    if (cutoff > 0) {
      allOrders = allOrders.filter((o) => new Date(o.createdAt).getTime() >= cutoff);
    }
  }

  // Fetch all items for these orders
  const allItems = await db.select().from(orderItems);
  const itemsByOrderId = new Map<string, any[]>();
  for (const item of allItems) {
    const existing = itemsByOrderId.get(item.orderId) || [];
    existing.push(item);
    itemsByOrderId.set(item.orderId, existing);
  }

  const allUsers = await db.select().from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const formatted = allOrders.map((o) =>
    formatOrder(o, itemsByOrderId.get(o.id) || [], o.userId ? userMap.get(o.userId) : null),
  );

  return c.json({
    success: true,
    data: formatted,
    orders: formatted,
    totalCount: formatted.length,
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
    const body = await c.req.json().catch(() => ({}));

    const [updated] = await db
      .update(orders)
      .set({
        status: "processing",
        trackingCode: body.trackingId || body.tracking_id || null,
        consignmentId: body.consignmentId || body.consignment_id || null,
        courierName: body.courierName || body.courier_name || "Steadfast",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    return c.json({ success: true, data: formatOrder(updated, items) });
  },
);

// POST /api/orders/:id/reject
ordersRouter.post("/:id/reject", requireAuth, requirePermission("orders:cancel"), async (c) => {
  const id = c.req.param("id");

  const body = await c.req.json().catch(() => ({}));

  const [updated] = await db
    .update(orders)
    .set({
      status: "rejected",
      rejectionReason: body.reason || body.rejection_reason || "Declined by store admin",
      updatedAt: new Date(),
    })
    .where(eq(orders.id, id))
    .returning();

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  return c.json({ success: true, data: formatOrder(updated, items) });
});

// POST /api/orders/bulk-status
ordersRouter.post(
  "/bulk-status",
  requireAuth,
  requirePermission("orders:update_status"),
  async (c) => {
    const { ids, status } = await c.req.json();

    if (!Array.isArray(ids) || !status) {
      return c.json({ success: false, error: "Invalid parameters" }, 400);
    }

    for (const id of ids) {
      await db
        .update(orders)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id));
    }

    return c.json({ success: true, count: ids.length });
  },
);

// PATCH /api/orders/:id/trash (soft-delete or restore)
ordersRouter.patch("/:id/trash", requireAuth, requirePermission("orders:cancel"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const restore = body.restore === true;

  const [updated] = await db
    .update(orders)
    .set({
      trashedAt: restore ? null : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, id))
    .returning();

  return c.json({ success: true, data: formatOrder(updated) });
});

// PATCH /api/orders/:id (general update)
ordersRouter.patch("/:id", requireAuth, requirePermission("orders:update_status"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

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

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  return c.json({ success: true, data: formatOrder(updated, items) });
});

// DELETE /api/orders/:id (permanent delete)
ordersRouter.delete("/:id", requireAuth, requirePermission("orders:delete"), async (c) => {
  const id = c.req.param("id");
  await db.delete(orders).where(eq(orders.id, id));
  return c.json({ success: true, message: "Order permanently deleted" });
});
