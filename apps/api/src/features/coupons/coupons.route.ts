import { randomUUID } from "node:crypto";
import { coupons, db } from "@growmate/db";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { requireAuth } from "../../infra/middleware/auth";
import { requirePermission } from "../../infra/middleware/require-permission";

export const couponsRouter = new Hono();

function formatCoupon(c: any) {
  if (!c) return c;
  return {
    ...c,
    discount_type: c.discountType,
    discount_value: c.discountValue,
    min_order_amount: c.minSpend,
    max_discount_amount: c.maxDiscount,
    usage_limit: c.usageLimit,
    used_count: c.usageCount,
    is_active: c.isActive,
    starts_at: c.startsAt ? new Date(c.startsAt).toISOString() : null,
    expires_at: c.expiresAt ? new Date(c.expiresAt).toISOString() : null,
    created_at: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
  };
}

// POST /api/coupons/validate (Public storefront cart validation)
couponsRouter.post("/validate", async (c) => {
  const { code, cartTotal } = await c.req.json();
  if (!code) {
    return c.json({ success: false, error: "Coupon code is required" }, 400);
  }

  const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code.toUpperCase()));

  if (!coupon?.isActive) {
    return c.json({ success: false, error: "Invalid or expired coupon code" }, 400);
  }

  if (coupon.minSpend && cartTotal < coupon.minSpend) {
    return c.json(
      {
        success: false,
        error: `Minimum spend of $${coupon.minSpend} required for this coupon.`,
      },
      400,
    );
  }

  let discount =
    coupon.discountType === "percentage"
      ? (cartTotal * coupon.discountValue) / 100
      : coupon.discountValue;

  if (coupon.maxDiscount && discount > coupon.maxDiscount) {
    discount = coupon.maxDiscount;
  }

  return c.json({
    success: true,
    data: {
      code: coupon.code,
      discountAmount: discount,
      discountType: coupon.discountType,
    },
  });
});

// GET /api/coupons (Admin list)
couponsRouter.get("/", requireAuth, requirePermission("coupons:view"), async (c) => {
  const list = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
  return c.json({ success: true, data: list.map(formatCoupon) });
});

// POST /api/coupons
couponsRouter.post("/", requireAuth, requirePermission("coupons:manage"), async (c) => {
  const body = await c.req.json();
  const id = body.id || randomUUID();

  const [newCoupon] = await db
    .insert(coupons)
    .values({
      id,
      code: body.code.toUpperCase(),
      description: body.description || null,
      discountType: body.discount_type || body.discountType || "percentage",
      discountValue: Number(
        body.discount_value !== undefined ? body.discount_value : body.discountValue,
      ),
      minSpend:
        body.min_order_amount !== undefined
          ? body.min_order_amount
            ? Number(body.min_order_amount)
            : null
          : body.minSpend
            ? Number(body.minSpend)
            : null,
      maxDiscount:
        body.max_discount_amount !== undefined
          ? body.max_discount_amount
            ? Number(body.max_discount_amount)
            : null
          : body.maxDiscount
            ? Number(body.maxDiscount)
            : null,
      usageLimit:
        body.usage_limit !== undefined
          ? body.usage_limit
            ? Number(body.usage_limit)
            : null
          : body.usageLimit
            ? Number(body.usageLimit)
            : null,
      isActive: body.is_active !== undefined ? !!body.is_active : body.isActive !== false,
      expiresAt: body.expires_at
        ? new Date(body.expires_at)
        : body.expiresAt
          ? new Date(body.expiresAt)
          : null,
    })
    .returning();

  return c.json({ success: true, data: formatCoupon(newCoupon) }, 201);
});

// PATCH /api/coupons/:id
couponsRouter.patch("/:id", requireAuth, requirePermission("coupons:manage"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const updateData: any = {};
  if (body.code !== undefined) updateData.code = body.code.toUpperCase();
  if (body.description !== undefined) updateData.description = body.description;
  if (body.discount_type !== undefined || body.discountType !== undefined) {
    updateData.discountType = body.discount_type || body.discountType;
  }
  if (body.discount_value !== undefined || body.discountValue !== undefined) {
    updateData.discountValue = Number(
      body.discount_value !== undefined ? body.discount_value : body.discountValue,
    );
  }
  if (body.min_order_amount !== undefined || body.minSpend !== undefined) {
    const val = body.min_order_amount !== undefined ? body.min_order_amount : body.minSpend;
    updateData.minSpend = val ? Number(val) : null;
  }
  if (body.max_discount_amount !== undefined || body.maxDiscount !== undefined) {
    const val =
      body.max_discount_amount !== undefined ? body.max_discount_amount : body.maxDiscount;
    updateData.maxDiscount = val ? Number(val) : null;
  }
  if (body.usage_limit !== undefined || body.usageLimit !== undefined) {
    const val = body.usage_limit !== undefined ? body.usage_limit : body.usageLimit;
    updateData.usageLimit = val ? Number(val) : null;
  }
  if (body.is_active !== undefined || body.isActive !== undefined) {
    updateData.isActive = body.is_active !== undefined ? !!body.is_active : !!body.isActive;
  }
  if (body.expires_at !== undefined || body.expiresAt !== undefined) {
    const val = body.expires_at || body.expiresAt;
    updateData.expiresAt = val ? new Date(val) : null;
  }

  const [updated] = await db.update(coupons).set(updateData).where(eq(coupons.id, id)).returning();

  return c.json({ success: true, data: formatCoupon(updated) });
});

// DELETE /api/coupons/:id
couponsRouter.delete("/:id", requireAuth, requirePermission("coupons:manage"), async (c) => {
  const id = c.req.param("id");
  await db.delete(coupons).where(eq(coupons.id, id));
  return c.json({ success: true, message: "Coupon deleted" });
});
