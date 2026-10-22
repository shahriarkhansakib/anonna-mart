import { db, orders, users } from "@growmate/db";
import { desc, eq } from "drizzle-orm";
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

// In-memory customer notes and store credits
const customerNotesStore = new Map<
  string,
  Array<{
    id: string;
    customer_user_id: string;
    author_id: string;
    content: string;
    created_at: string;
  }>
>();
const customerCreditsStore = new Map<
  string,
  Array<{
    id: string;
    customer_user_id: string;
    amount: number;
    reason: string;
    created_by: string;
    created_at: string;
  }>
>();

// GET /api/users/me (Customer's own profile)
usersRouter.get("/me", requireAuth, async (c) => {
  const authUser = c.get("user") as any;
  const [user] = await db.select().from(users).where(eq(users.id, authUser.id));
  if (!user) {
    return c.json({ success: false, error: "User not found" }, 404);
  }

  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt));
  return c.json({ success: true, data: formatProfile(user, userOrders) });
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
  const notes = customerNotesStore.get(id) || [];
  const credits = customerCreditsStore.get(id) || [];

  return c.json({
    success: true,
    data: {
      ...profile,
      orders: formattedOrders,
      customer_notes: notes,
      store_credits: credits,
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

// POST /api/users/:id/notes (Staff only)
usersRouter.post("/:id/notes", requireAuth, requireRole("admin"), async (c) => {
  const customerId = c.req.param("id");
  const authUser = c.get("user") as any;
  const { content } = await c.req.json();

  if (!content) return c.json({ error: "Note content required" }, 400);

  const note = {
    id: `note-${Date.now()}`,
    customer_user_id: customerId,
    author_id: authUser.id,
    content,
    created_at: new Date().toISOString(),
  };

  const existing = customerNotesStore.get(customerId) || [];
  existing.unshift(note);
  customerNotesStore.set(customerId, existing);

  return c.json({ success: true, data: note });
});

// POST /api/users/:id/credits (Staff only)
usersRouter.post("/:id/credits", requireAuth, requireRole("admin"), async (c) => {
  const customerId = c.req.param("id");
  const authUser = c.get("user") as any;
  const { amount, reason } = await c.req.json();

  if (!amount || Number(amount) <= 0) return c.json({ error: "Valid amount required" }, 400);

  const credit = {
    id: `cred-${Date.now()}`,
    customer_user_id: customerId,
    amount: Number(amount),
    reason: reason || "Store Courtesy Credit",
    created_by: authUser.id,
    created_at: new Date().toISOString(),
  };

  const existing = customerCreditsStore.get(customerId) || [];
  existing.unshift(credit);
  customerCreditsStore.set(customerId, existing);

  return c.json({ success: true, data: credit });
});
