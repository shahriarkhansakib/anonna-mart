import { categories, db, orderItems, orders, products, users } from "@growmate/db";
import { desc } from "drizzle-orm";
import { Hono } from "hono";
import { requireAuth } from "../../infra/middleware/auth";
import { requirePermission } from "../../infra/middleware/require-permission";

function subDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function format(date: Date, fmt: string): string {
  if (fmt === "yyyy-MM-dd") return date.toISOString().slice(0, 10);
  if (fmt === "EEE") return date.toLocaleDateString("en-US", { weekday: "short" });
  if (fmt === "d MMM") return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
  return date.toISOString().slice(0, 10);
}

export const analyticsRouter = new Hono();

// All analytics endpoints require auth and analytics:view_overview permission
analyticsRouter.use("/*", requireAuth, requirePermission("analytics:view_overview"));

// Helper to compute analytics dynamically from real database rows
async function computeRealAnalytics() {
  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const allProducts = await db.select().from(products);
  const allCategories = await db.select().from(categories);
  const allUsers = await db.select().from(users);
  const allItems = await db.select().from(orderItems);

  const categoryMap = new Map<string, string>();
  for (const cat of allCategories) {
    categoryMap.set(cat.id, cat.name);
  }

  const productMap = new Map<string, any>();
  for (const prod of allProducts) {
    productMap.set(prod.id, prod);
  }

  const activeOrders = allOrders.filter(
    (o) => !o.trashedAt && o.status !== "cancelled" && o.status !== "rejected",
  );
  const cancelledOrders = allOrders.filter(
    (o) => o.status === "cancelled" || o.status === "rejected",
  );

  const totalRevenue = activeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const cancelledRevenue = cancelledOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalOrders = allOrders.filter((o) => !o.trashedAt).length;
  const pendingOrders = allOrders.filter((o) => !o.trashedAt && o.status === "pending").length;

  const lowStockThreshold = 10;
  const lowStockProducts = allProducts.filter(
    (p) => (p.stockQuantity ?? 0) <= (p.lowStockThreshold || lowStockThreshold),
  );

  // Compute 7-day daily trends from actual orders
  const dailyTrends: { date: string; orders: number; revenue: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = subDays(now, i);
    const dateStr = format(d, "yyyy-MM-dd");
    const dayLabel = format(d, "EEE");

    const ordersOnDay = activeOrders.filter((o) => {
      const oDate = format(new Date(o.createdAt), "yyyy-MM-dd");
      return oDate === dateStr;
    });

    const dayRev = ordersOnDay.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    dailyTrends.push({
      date: dayLabel,
      orders: ordersOnDay.length,
      revenue: Math.round(dayRev),
    });
  }

  // Order status distribution
  const statusCounts: Record<string, number> = {
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    rejected: 0,
  };
  for (const o of allOrders) {
    if (o.status && statusCounts[o.status] !== undefined) {
      statusCounts[o.status]++;
    }
  }

  const statusColors: Record<string, string> = {
    pending: "hsl(45, 93%, 47%)",
    processing: "hsl(217, 91%, 60%)",
    shipped: "hsl(263, 70%, 50%)",
    delivered: "hsl(142, 71%, 45%)",
    cancelled: "hsl(0, 84%, 60%)",
    rejected: "hsl(0, 72%, 51%)",
  };

  const orderStatusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: statusColors[name] || "hsl(var(--muted))",
  }));

  // Top products from order items with real categories
  const productSalesMap = new Map<string, { quantity: number; revenue: number; name: string }>();
  for (const item of allItems) {
    const existing = productSalesMap.get(item.productId) || {
      quantity: 0,
      revenue: 0,
      name: item.productName,
    };
    existing.quantity += item.quantity || 1;
    existing.revenue += item.totalPrice || 0;
    productSalesMap.set(item.productId, existing);
  }

  const topProducts = Array.from(productSalesMap.entries())
    .map(([id, val]) => {
      const prod = productMap.get(id);
      const catName = prod?.categoryId ? categoryMap.get(prod.categoryId) || "General" : "General";
      const img = Array.isArray(prod?.images) && prod.images.length > 0 ? prod.images[0] : null;
      return {
        id,
        name: val.name,
        totalSold: val.quantity,
        revenue: val.revenue,
        category: catName,
        image_url: img,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const recentOrders = allOrders.slice(0, 5).map((o) => ({
    id: o.id,
    order_number: o.orderNumber,
    customer_name: o.customerName,
    total_amount: o.totalAmount,
    status: o.status,
    created_at: new Date(o.createdAt).toISOString(),
  }));

  // Dynamic Growth calculation: compare current 30 days against preceding 30 days
  const thirtyDaysAgo = subDays(now, 30);
  const sixtyDaysAgo = subDays(now, 60);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const currentPeriodOrders = activeOrders.filter((o) => new Date(o.createdAt) >= thirtyDaysAgo);
  const priorPeriodOrders = activeOrders.filter(
    (o) => new Date(o.createdAt) >= sixtyDaysAgo && new Date(o.createdAt) < thirtyDaysAgo,
  );

  const currentRevenue = currentPeriodOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const priorRevenue = priorPeriodOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const revenueGrowth =
    priorRevenue > 0
      ? Math.round(((currentRevenue - priorRevenue) / priorRevenue) * 100 * 10) / 10
      : currentRevenue > 0
        ? 100
        : 0;

  const orderGrowth =
    priorPeriodOrders.length > 0
      ? Math.round(
          ((currentPeriodOrders.length - priorPeriodOrders.length) / priorPeriodOrders.length) *
            100 *
            10,
        ) / 10
      : currentPeriodOrders.length > 0
        ? 100
        : 0;

  const currentUsers = allUsers.filter((u) => new Date(u.createdAt) >= thirtyDaysAgo);
  const priorUsers = allUsers.filter(
    (u) => new Date(u.createdAt) >= sixtyDaysAgo && new Date(u.createdAt) < thirtyDaysAgo,
  );

  const userGrowth =
    priorUsers.length > 0
      ? Math.round(((currentUsers.length - priorUsers.length) / priorUsers.length) * 100 * 10) / 10
      : currentUsers.length > 0
        ? 100
        : 0;

  const newUsersThisMonth = allUsers.filter((u) => new Date(u.createdAt) >= startOfMonth).length;

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    activeRevenue: Math.round(totalRevenue * 100) / 100,
    cancelledRevenue: Math.round(cancelledRevenue * 100) / 100,
    totalOrders,
    activeOrders: activeOrders.length,
    cancelledOrders: cancelledOrders.length,
    pendingOrders,
    totalProducts: allProducts.length,
    lowStockCount: lowStockProducts.length,
    totalUsers: allUsers.length,
    newUsersThisMonth,
    averageOrderValue: activeOrders.length > 0 ? Math.round(totalRevenue / activeOrders.length) : 0,
    revenueGrowth,
    orderGrowth,
    userGrowth,
    dailyTrends,
    orderStatusDistribution,
    topProducts,
    recentOrders,
    lowStockProducts: lowStockProducts.map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stockQuantity ?? 0,
      price: p.price,
      image_url: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
    })),
  };
}

// GET /api/analytics/overview
analyticsRouter.get("/overview", async (c) => {
  const stats = await computeRealAnalytics();
  return c.json({ success: true, data: stats });
});

// GET /api/analytics/dashboard-stats (Direct drop-in for useAdminStats)
analyticsRouter.get("/dashboard-stats", async (c) => {
  const stats = await computeRealAnalytics();
  return c.json({
    totalProducts: stats.totalProducts,
    totalOrders: stats.totalOrders,
    activeOrders: stats.activeOrders,
    cancelledOrders: stats.cancelledOrders,
    totalUsers: stats.totalUsers,
    activeRevenue: stats.activeRevenue,
    totalRevenue: stats.totalRevenue,
    cancelledRevenue: stats.cancelledRevenue,
    pendingOrders: stats.pendingOrders,
    recentOrders: stats.recentOrders,
  });
});
