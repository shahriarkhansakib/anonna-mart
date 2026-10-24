import { randomUUID } from "node:crypto";
import { customerNotes, db, orders, storeCredits, users } from "@growmate/db";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { requireAuth } from "../../infra/middleware/auth";
import { requirePermission } from "../../infra/middleware/require-permission";
import { requireRole } from "../../infra/middleware/role";

export const usersRouter = new Hono();

function formatProfile(u: any, userOrders: any[] = []) {
  const totalSpent = userOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  return {
    id: u.id,
    user_id: u.id,
    full_name: u.name,
    email: u.email,
    phone: u.phone || null,
    avatar_url: u.avatarUrl || u.image || null,
    address: u.address || null,
    division: u.division || null,
    district: u.district || null,
    thana: u.thana || null,
    banned: !!u.banned,
    ban_reason: u.banReason || null,
    role: u.role,
    user_roles: [{ role: u.role }],
    orders_count: userOrders.length,
    total_spent: totalSpent,
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

// GET /api/users (Staff view all customers)
usersRouter.get("/", requireAuth, requirePermission("customers:view"), async (c) => {
  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
  const allOrders = await db.select().from(orders);

  const ordersByUser = new Map<string, any[]>();
  for (const o of allOrders) {
    if (o.userId) {
      const existing = ordersByUser.get(o.userId) || [];
      existing.push(o);
      ordersByUser.set(o.userId, existing);
    }
  }

  const profiles = allUsers.map((u) => formatProfile(u, ordersByUser.get(u.id) || []));

  return c.json({
    success: true,
    data: profiles,
    users: profiles,
    totalCount: profiles.length,
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

  const profile = formatProfile(user, userOrders);

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

// POST /api/users/:id/credits (Staff only - Real PostgreSQL persistence)
usersRouter.post("/:id/credits", requireAuth, requireRole("admin"), async (c) => {
  const customerId = c.req.param("id");
  const authUser = c.get("user") as any;
  const { amount, reason } = await c.req.json();

  if (!amount || Number(amount) <= 0) return c.json({ error: "Valid amount required" }, 400);

  const creditId = `cred-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const [created] = await db
    .insert(storeCredits)
    .values({
      id: creditId,
      customerUserId: customerId,
      amount: Number(amount),
      reason: reason || "Store Courtesy Credit",
      createdBy: authUser.id,
    })
    .returning();

  const formatted = {
    id: created.id,
    customer_user_id: created.customerUserId,
    amount: created.amount,
    reason: created.reason,
    created_by: created.createdBy,
    created_at: created.createdAt.toISOString(),
  };

  return c.json({ success: true, data: formatted });
});
