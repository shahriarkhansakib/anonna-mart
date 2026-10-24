import { randomUUID } from "node:crypto";
import { customerNotes, db, orders, storeCredits, users } from "@growmate/db";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { requireAuth } from "../../infra/middleware/auth";
import { requirePermission } from "../../infra/middleware/require-permission";
import { requireRole } from "../../infra/middleware/role";

export const usersRouter = new Hono();

function computeSegment(
  orderCount: number,
  totalSpent: number,
  lastOrderDate: Date | string | null,
  createdAt: Date | string,
): "vip" | "high_spender" | "at_risk" | "new" {
  if (orderCount >= 5 || totalSpent >= 10000) return "vip";
  if (totalSpent >= 5000) return "high_spender";
  const now = Date.now();
  const lastOrderTime = lastOrderDate ? new Date(lastOrderDate).getTime() : 0;
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;
  if (lastOrderTime > 0 && lastOrderTime < sixtyDaysAgo) return "at_risk";
  const createdTime = new Date(createdAt).getTime();
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
  if (createdTime > fourteenDaysAgo && orderCount <= 1) return "new";
  return "new";
}

function formatProfile(u: any, userOrders: any[] = [], creditSum = 0) {
  const activeOrders = userOrders.filter(
    (o) => o.status !== "cancelled" && o.status !== "rejected",
  );
  const totalSpent = activeOrders.reduce(
    (sum, o) => sum + Number(o.totalAmount || o.total_amount || 0),
    0,
  );
  const lastOrder = userOrders[0];
  const lastOrderDate = lastOrder ? lastOrder.createdAt || lastOrder.created_at : null;
  const segment = computeSegment(activeOrders.length, totalSpent, lastOrderDate, u.createdAt);

  return {
    id: u.id,
    user_id: u.id,
    full_name: u.name,
    name: u.name,
    email: u.email,
    phone: u.phone || null,
    avatar_url: u.avatarUrl || u.image || null,
    address: u.address || null,
    division: u.division || null,
    district: u.district || null,
    thana: u.thana || null,
    banned: !!u.banned,
    ban_reason: u.banReason || null,
    role: u.role || "user",
    roles: [u.role || "user"],
    user_roles: [{ role: u.role || "user" }],
    order_count: activeOrders.length,
    orders_count: activeOrders.length,
    total_spent: totalSpent,
    last_order_date: lastOrderDate ? new Date(lastOrderDate).toISOString() : null,
    last_payment_status: lastOrder?.paymentStatus || lastOrder?.payment_status || "unpaid",
    last_payment_method: lastOrder?.paymentMethod || lastOrder?.payment_method || "cod",
    store_credit_balance: creditSum,
    segment,
    created_at: new Date(u.createdAt).toISOString(),
  };
}

// GET /api/users/me (Customer self profile)
usersRouter.get("/me", requireAuth, async (c) => {
  const authUser = c.get("user") as any;
  const [user] = await db.select().from(users).where(eq(users.id, authUser.id));

  if (!user) {
    return c.json({ success: false, error: "User profile not found" }, 404);
  }

  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, authUser.id))
    .orderBy(desc(orders.createdAt));

  return c.json({
    success: true,
    data: formatProfile(user, userOrders),
  });
});

// GET /api/users/credits (Staff view all store credits for Ecommerce Customers list)
usersRouter.get("/credits", requireAuth, requireRole("admin"), async (c) => {
  const allCredits = await db.select().from(storeCredits).orderBy(desc(storeCredits.createdAt));
  return c.json({
    success: true,
    data: allCredits.map((c) => ({
      id: c.id,
      customer_user_id: c.customerUserId,
      amount: c.amount,
      reason: c.reason,
      created_by: c.createdBy,
      created_at: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
    })),
  });
});

// GET /api/users (Staff view all customers with pagination, search, segments, and store KPIs)
usersRouter.get("/", requireAuth, requirePermission("customers:view"), async (c) => {
  const page = Math.max(1, Number(c.req.query("page") || 1));
  const limit = Math.min(
    100,
    Math.max(1, Number(c.req.query("limit") || c.req.query("pageSize") || 25)),
  );
  const offset = (page - 1) * limit;
  const search = (c.req.query("search") || c.req.query("q") || "").trim().toLowerCase();
  const segmentFilter = (c.req.query("segment") || "all").toLowerCase();
  const paymentFilter = (c.req.query("payment") || "all").toLowerCase();
  const sortBy = c.req.query("sortBy") || "recent";
  const sortOrder = (c.req.query("order") || "desc").toLowerCase();

  // 1. Fetch all users
  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

  // 2. Fetch all orders and organize by user
  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const ordersByUser = new Map<string, any[]>();
  let storeTotalSales = 0;
  let storePaidSales = 0;
  let storePendingSales = 0;
  const payingCustomers = new Set<string>();

  for (const o of allOrders) {
    if (o.status !== "cancelled" && o.status !== "rejected") {
      const amt = Number(o.totalAmount || 0);
      storeTotalSales += amt;
      if (o.paymentStatus === "paid") storePaidSales += amt;
      else storePendingSales += amt;
      if (o.userId) payingCustomers.add(o.userId);
    }
    if (o.userId) {
      const list = ordersByUser.get(o.userId) || [];
      list.push(o);
      ordersByUser.set(o.userId, list);
    }
  }

  // 3. Fetch store credits and organize by customer
  const allCredits = await db.select().from(storeCredits);
  const creditsByUser = new Map<string, number>();
  let storeTotalCreditsOutstanding = 0;

  for (const cr of allCredits) {
    const amt = Number(cr.amount || 0);
    creditsByUser.set(cr.customerUserId, (creditsByUser.get(cr.customerUserId) || 0) + amt);
    storeTotalCreditsOutstanding += amt;
  }

  // 4. Map and filter
  let customerList = allUsers.map((u) => {
    const uOrders = ordersByUser.get(u.id) || [];
    const uCredit = creditsByUser.get(u.id) || 0;
    return formatProfile(u, uOrders, uCredit);
  });

  // Apply search query (matches name, email, phone)
  if (search) {
    customerList = customerList.filter(
      (cust) =>
        (cust.name && cust.name.toLowerCase().includes(search)) ||
        (cust.email && cust.email.toLowerCase().includes(search)) ||
        (cust.phone && cust.phone.toLowerCase().includes(search)),
    );
  }

  // Apply segment filter
  if (segmentFilter !== "all") {
    customerList = customerList.filter((cust) => cust.segment === segmentFilter);
  }

  // Apply payment status filter
  if (paymentFilter !== "all") {
    customerList = customerList.filter((cust) => cust.last_payment_status === paymentFilter);
  }

  // Apply sorting
  customerList.sort((a, b) => {
    let diff = 0;
    if (sortBy === "total_spent") {
      diff = a.total_spent - b.total_spent;
    } else if (sortBy === "order_count") {
      diff = a.order_count - b.order_count;
    } else if (sortBy === "credit") {
      diff = a.store_credit_balance - b.store_credit_balance;
    } else {
      // "recent" by default: last_order_date or created_at
      const timeA = a.last_order_date
        ? new Date(a.last_order_date).getTime()
        : new Date(a.created_at).getTime();
      const timeB = b.last_order_date
        ? new Date(b.last_order_date).getTime()
        : new Date(b.created_at).getTime();
      diff = timeA - timeB;
    }
    return sortOrder === "asc" ? diff : -diff;
  });

  const totalCount = customerList.length;
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const paginatedData = customerList.slice(offset, offset + limit);

  const avgLtv = payingCustomers.size > 0 ? Math.round(storeTotalSales / payingCustomers.size) : 0;

  return c.json({
    success: true,
    data: paginatedData,
    users: paginatedData,
    stats: {
      totalCustomers: allUsers.length,
      totalSales: storeTotalSales,
      paidSales: storePaidSales,
      pendingSales: storePendingSales,
      avgLtv,
      totalCreditsOutstanding: storeTotalCreditsOutstanding,
    },
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

// GET /api/users/:id
usersRouter.get("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const authUser = c.get("user") as any;

  // Customers can only view their own profile; staff with customers:view can view any
  if (authUser.id !== id && authUser.role !== "admin" && authUser.role !== "super_admin") {
    return c.json({ error: "Forbidden", message: "Access denied" }, 403);
  }

  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) {
    return c.json({ success: false, error: "User not found" }, 404);
  }

  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, id))
    .orderBy(desc(orders.createdAt));

  const formattedOrders = userOrders.map((o) => ({
    id: o.id,
    total_amount: o.totalAmount,
    status: o.status,
    created_at: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
    shipping_address: o.shippingAddress,
    payment_status: o.paymentStatus,
    payment_method: o.paymentMethod,
    tracking_code: o.trackingCode,
  }));

  // Persistent notes and credits from PostgreSQL
  const notes = await db
    .select()
    .from(customerNotes)
    .where(eq(customerNotes.customerUserId, id))
    .orderBy(desc(customerNotes.createdAt));

  const credits = await db
    .select()
    .from(storeCredits)
    .where(eq(storeCredits.customerUserId, id))
    .orderBy(desc(storeCredits.createdAt));

  const balance = credits.reduce((sum, cr) => sum + Number(cr.amount || 0), 0);
  const profile = formatProfile(user, userOrders, balance);

  const formattedNotes = notes.map((n) => ({
    id: n.id,
    customer_user_id: n.customerUserId,
    author_id: n.authorId,
    content: n.content,
    created_at: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
  }));

  const formattedCredits = credits.map((cr) => ({
    id: cr.id,
    customer_user_id: cr.customerUserId,
    amount: cr.amount,
    reason: cr.reason,
    created_by: cr.createdBy,
    created_at: cr.createdAt ? new Date(cr.createdAt).toISOString() : new Date().toISOString(),
  }));

  return c.json({
    success: true,
    data: {
      ...profile,
      store_credit_balance: balance,
      balance,
      orders: formattedOrders,
      notes: formattedNotes,
      customer_notes: formattedNotes,
      credits: formattedCredits,
      store_credits: formattedCredits,
    },
  });
});

// PATCH /api/users/:id
usersRouter.patch("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const authUser = c.get("user") as any;
  const body = await c.req.json();

  const isStaff = authUser.role === "admin" || authUser.role === "super_admin";
  const isSelf = authUser.id === id;

  if (!isSelf && !isStaff) {
    return c.json({ error: "Forbidden", message: "Access denied" }, 403);
  }

  const updateData: any = { updatedAt: new Date() };

  // Only staff can modify ban status
  if (isStaff) {
    if (body.banned !== undefined) updateData.banned = !!body.banned;
    if (body.banReason !== undefined || body.ban_reason !== undefined) {
      updateData.banReason = body.banReason || body.ban_reason;
    }
  }

  // Profile fields can be updated by user themselves or staff
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.address !== undefined) updateData.address = body.address;
  if (body.division !== undefined) updateData.division = body.division;
  if (body.district !== undefined) updateData.district = body.district;
  if (body.thana !== undefined) updateData.thana = body.thana;
  if (body.full_name !== undefined || body.name !== undefined) {
    updateData.name = body.full_name || body.name;
  }

  const [updated] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
  return c.json({ success: true, data: formatProfile(updated) });
});

// POST /api/users/:id/notes (Staff only - Real PostgreSQL persistence)
usersRouter.post("/:id/notes", requireAuth, requireRole("admin"), async (c) => {
  const customerId = c.req.param("id");
  const authUser = c.get("user") as any;
  const { content } = await c.req.json();

  if (!content || !content.trim()) return c.json({ error: "Note content required" }, 400);

  const noteId = `note-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const [created] = await db
    .insert(customerNotes)
    .values({
      id: noteId,
      customerUserId: customerId,
      authorId: authUser.id,
      content: content.trim(),
    })
    .returning();

  const formatted = {
    id: created.id,
    customer_user_id: created.customerUserId,
    author_id: created.authorId,
    content: created.content,
    created_at: created.createdAt.toISOString(),
  };

  return c.json({ success: true, data: formatted });
});

// DELETE /api/users/:id/notes/:noteId (Staff only - Fixes 404!)
usersRouter.delete("/:id/notes/:noteId", requireAuth, requireRole("admin"), async (c) => {
  const customerId = c.req.param("id");
  const noteId = c.req.param("noteId");

  await db
    .delete(customerNotes)
    .where(and(eq(customerNotes.id, noteId), eq(customerNotes.customerUserId, customerId)));

  return c.json({ success: true, message: "Customer note deleted successfully" });
});

// POST /api/users/:id/credits (Staff only - Real PostgreSQL persistence with 2-way wallet)
usersRouter.post("/:id/credits", requireAuth, requireRole("admin"), async (c) => {
  const customerId = c.req.param("id");
  const authUser = c.get("user") as any;
  const body = await c.req.json();
  const amount = Number(body.amount);
  const reason = (body.reason || "").trim();

  if (isNaN(amount) || amount === 0) {
    return c.json({ success: false, error: "A non-zero credit amount is required" }, 400);
  }

  const [customer] = await db.select().from(users).where(eq(users.id, customerId));
  if (!customer) {
    return c.json({ success: false, error: "Customer not found" }, 404);
  }

  // Calculate existing balance
  const existingCredits = await db
    .select()
    .from(storeCredits)
    .where(eq(storeCredits.customerUserId, customerId));

  const currentBalance = existingCredits.reduce((sum, cr) => sum + Number(cr.amount || 0), 0);

  // If deducting credit (negative amount), ensure balance does not drop below 0
  if (amount < 0 && currentBalance + amount < 0) {
    return c.json(
      {
        success: false,
        error: `Insufficient store credit. Current balance is ৳${currentBalance.toLocaleString()}`,
        currentBalance,
      },
      400,
    );
  }

  const creditId = `cred-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const defaultReason = amount > 0 ? "Store Courtesy Credit" : "Credit Redemption / Adjustment";

  const [created] = await db
    .insert(storeCredits)
    .values({
      id: creditId,
      customerUserId: customerId,
      amount: amount,
      reason: reason || defaultReason,
      createdBy: authUser.id,
    })
    .returning();

  const newBalance = currentBalance + amount;

  const formatted = {
    id: created.id,
    customer_user_id: created.customerUserId,
    amount: created.amount,
    reason: created.reason,
    created_by: created.createdBy,
    created_at: created.createdAt.toISOString(),
    balance: newBalance,
  };

  return c.json({ success: true, data: formatted, balance: newBalance });
});

// POST /api/users/:id/ban (Staff only - Ban customer account)
usersRouter.post(
  "/:id/ban",
  requireAuth,
  requirePermission("customers:manage_status"),
  async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const reason = (body.reason || "Administrative account suspension").trim();

    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return c.json({ success: false, error: "User not found" }, 404);

    const [updated] = await db
      .update(users)
      .set({
        banned: true,
        banReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return c.json({
      success: true,
      message: "Customer account banned successfully",
      data: formatProfile(updated),
    });
  },
);

// POST /api/users/:id/unban (Staff only - Restore customer account)
usersRouter.post(
  "/:id/unban",
  requireAuth,
  requirePermission("customers:manage_status"),
  async (c) => {
    const id = c.req.param("id");

    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return c.json({ success: false, error: "User not found" }, 404);

    const [updated] = await db
      .update(users)
      .set({
        banned: false,
        banReason: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return c.json({
      success: true,
      message: "Customer account restored successfully",
      data: formatProfile(updated),
    });
  },
);
