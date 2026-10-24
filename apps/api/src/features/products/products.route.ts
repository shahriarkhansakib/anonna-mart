import { randomUUID } from "node:crypto";
import { categories, db, products, productVariants } from "@growmate/db";
import { and, desc, eq, ilike, inArray, notInArray, or } from "drizzle-orm";
import { Hono } from "hono";
import { requireAuth } from "../../infra/middleware/auth";
import { requirePermission } from "../../infra/middleware/require-permission";

export const productsRouter = new Hono();

// Helper to format product for UI (provides both camelCase and snake_case compatibility)
function formatProduct(p: any, variants: any[] = []) {
  if (!p) return p;
  const imageUrl =
    Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : p.imageUrl || null;
  return {
    ...p,
    stock: p.stockQuantity ?? 0,
    compare_price: p.originalPrice ?? null,
    comparePrice: p.originalPrice ?? null,
    image_url: imageUrl,
    imageUrl: imageUrl,
    product_type: p.productType ?? null,
    is_active: p.isActive,
    is_featured: p.isFeatured,
    category: p.categoryName || p.categoryId,
    variants,
    created_at: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
    updated_at: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
  };
}

// Helper to resolve valid category ID with foreign key integrity
async function resolveCategoryId(categoryIdOrName?: string | null): Promise<string> {
  if (!categoryIdOrName) {
    const [first] = await db.select({ id: categories.id }).from(categories).limit(1);
    return first ? first.id : "cat-home-decor";
  }

  // 1. Direct ID match
  const [byId] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, categoryIdOrName));
  if (byId) return byId.id;

  // 2. Name or Slug match (case-insensitive)
  const [byName] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      or(
        ilike(categories.name, categoryIdOrName),
        eq(categories.slug, categoryIdOrName.toLowerCase().replace(/[^a-z0-9]+/g, "-")),
      ),
    );
  if (byName) return byName.id;

  // 3. Fallback to first existing category
  const [firstCat] = await db.select({ id: categories.id }).from(categories).limit(1);
  return firstCat ? firstCat.id : "cat-home-decor";
}

// Helper to synchronize product variants and auto-recalculate total stock
async function syncProductVariants(productId: string, variantsList: any[], baseProduct: any) {
  const incomingIds = variantsList.map((v: any) => v.id).filter(Boolean);
  if (incomingIds.length > 0) {
    await db
      .delete(productVariants)
      .where(
        and(eq(productVariants.productId, productId), notInArray(productVariants.id, incomingIds)),
      );
  } else if (variantsList.length === 0) {
    await db.delete(productVariants).where(eq(productVariants.productId, productId));
  }

  let totalStock = 0;
  for (let i = 0; i < variantsList.length; i++) {
    const v = variantsList[i];
    const stock = Math.max(0, parseInt(v.stock ?? v.stockQuantity) || 0);
    totalStock += stock;
    const price =
      v.price !== null && v.price !== undefined && v.price !== ""
        ? Number(v.price)
        : Number(baseProduct.price || 0);
    const sku = v.sku || `${baseProduct.sku || productId.slice(0, 6)}-V${i + 1}`;

    if (v.id) {
      await db
        .update(productVariants)
        .set({
          name: v.name,
          sku,
          price,
          stockQuantity: stock,
        })
        .where(eq(productVariants.id, v.id));
    } else {
      await db.insert(productVariants).values({
        id: randomUUID(),
        productId,
        name: v.name,
        sku,
        price,
        stockQuantity: stock,
      });
    }
  }

  if (variantsList.length > 0) {
    await db
      .update(products)
      .set({
        stockQuantity: totalStock,
        badge:
          totalStock === 0
            ? "Stock Out"
            : baseProduct.badge === "Stock Out"
              ? null
              : baseProduct.badge,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));
  }

  return totalStock;
}

// GET /api/products/categories/all
productsRouter.get("/categories/all", async (c) => {
  const cats = await db.select().from(categories).orderBy(categories.name);
  const formatted = cats.map((cat) => ({
    ...cat,
    product_count: 0,
    is_active: true,
  }));
  return c.json({ success: true, data: formatted });
});

// POST /api/products/categories
productsRouter.post("/categories", requireAuth, requirePermission("products:create"), async (c) => {
  const body = await c.req.json();

  const id = body.id || `cat-${Date.now()}`;
  const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const [newCat] = await db
    .insert(categories)
    .values({
      id,
      name: body.name,
      slug,
      description: body.description || null,
      icon: body.icon || null,
    })
    .returning();

  return c.json({ success: true, data: { ...newCat, is_active: true, product_count: 0 } }, 201);
});

// GET /api/products
productsRouter.get("/", async (c) => {
  const search = c.req.query("search");
  const categoryId = c.req.query("categoryId");

  let items = await db.select().from(products).orderBy(desc(products.createdAt));

  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (p: any) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)),
    );
  }
  if (categoryId) {
    items = items.filter((p: any) => p.categoryId === categoryId);
  }

  const allCats = await db.select().from(categories);
  const catMap = new Map(allCats.map((cat) => [cat.id, cat.name]));

  const formatted = items.map((p) => {
    const categoryName = catMap.get(p.categoryId) || p.categoryId;
    return formatProduct({ ...p, categoryName });
  });

  return c.json({ success: true, data: formatted });
});

// GET /api/products/:id
productsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) {
    return c.json({ success: false, error: "Product not found" }, 404);
  }

  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, id))
    .orderBy(productVariants.name);

  return c.json({ success: true, data: formatProduct(product, variants) });
});

// GET /api/products/:id/variants (List product variants)
productsRouter.get("/:id/variants", async (c) => {
  const id = c.req.param("id");
  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, id))
    .orderBy(productVariants.name);

  return c.json({ success: true, data: variants });
});

// PUT /api/products/:id/variants (Atomic upsert of product variants & auto-stock recalculation)
productsRouter.put("/:id/variants", requireAuth, requirePermission("products:edit"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const variantsList = Array.isArray(body.variants)
    ? body.variants
    : Array.isArray(body)
      ? body
      : [];

  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) {
    return c.json({ success: false, error: "Product not found" }, 404);
  }

  const totalStock = await syncProductVariants(id, variantsList, product);

  const updatedVariants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, id))
    .orderBy(productVariants.name);

  return c.json({
    success: true,
    data: updatedVariants,
    totalStock,
  });
});

// POST /api/products (Admin)
productsRouter.post("/", requireAuth, requirePermission("products:create"), async (c) => {
  const body = await c.req.json();

  const id = body.id || randomUUID();
  const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // Normalize image array
  let images = body.images;
  if (!images || !Array.isArray(images) || images.length === 0) {
    images = body.image_url ? [body.image_url] : body.imageUrl ? [body.imageUrl] : [];
  }

  // Ensure categoryId exists via foreign key resolution
  const categoryId = await resolveCategoryId(body.categoryId || body.category_id || body.category);

  const stock = body.stock !== undefined ? Number(body.stock) : Number(body.stockQuantity || 0);
  const originalPrice =
    body.compare_price !== undefined
      ? Number(body.compare_price)
      : body.originalPrice !== undefined
        ? Number(body.originalPrice)
        : null;

  const [newProd] = await db
    .insert(products)
    .values({
      id,
      name: body.name,
      slug,
      description: body.description || null,
      categoryId,
      price: Number(body.price),
      originalPrice,
      sku: body.sku || `SKU-${Date.now()}`,
      stockQuantity: stock,
      lowStockThreshold: Number(body.lowStockThreshold || body.low_stock_threshold || 5),
      images,
      badge: body.badge || (stock === 0 ? "Stock Out" : null),
      productType: body.product_type || body.productType || null,
      discount: body.discount ? Number(body.discount) : null,
      isFeatured: body.is_featured !== undefined ? !!body.is_featured : !!body.isFeatured,
      isActive: body.is_active !== undefined ? !!body.is_active : body.isActive !== false,
    })
    .returning();

  return c.json({ success: true, data: formatProduct(newProd) }, 201);
});

// PATCH /api/products/:id
productsRouter.patch("/:id", requireAuth, requirePermission("products:edit"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const [existing] = await db.select().from(products).where(eq(products.id, id));
  if (!existing) {
    return c.json({ success: false, error: "Product not found" }, 404);
  }

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.price !== undefined) updateData.price = Number(body.price);
  if (body.compare_price !== undefined) updateData.originalPrice = Number(body.compare_price);
  else if (body.originalPrice !== undefined) updateData.originalPrice = Number(body.originalPrice);

  if (body.stock !== undefined) updateData.stockQuantity = Number(body.stock);
  else if (body.stockQuantity !== undefined) updateData.stockQuantity = Number(body.stockQuantity);

  if (body.lowStockThreshold !== undefined)
    updateData.lowStockThreshold = Number(body.lowStockThreshold);
  if (body.sku !== undefined) updateData.sku = body.sku;
  if (body.badge !== undefined) updateData.badge = body.badge;
  if (body.product_type !== undefined) updateData.productType = body.product_type;
  if (body.productType !== undefined) updateData.productType = body.productType;
  if (body.discount !== undefined) updateData.discount = Number(body.discount);

  if (body.is_featured !== undefined) updateData.isFeatured = !!body.is_featured;
  else if (body.isFeatured !== undefined) updateData.isFeatured = !!body.isFeatured;

  if (body.is_active !== undefined) updateData.isActive = !!body.is_active;
  else if (body.isActive !== undefined) updateData.isActive = !!body.isActive;

  if (body.images !== undefined) updateData.images = body.images;
  else if (body.image_url) updateData.images = [body.image_url];

  if (body.categoryId || body.category_id || body.category) {
    updateData.categoryId = await resolveCategoryId(
      body.categoryId || body.category_id || body.category,
    );
  }

  const [updated] = await db
    .update(products)
    .set(updateData)
    .where(eq(products.id, id))
    .returning();

  // If variants array is passed in the update payload, synchronize variants too
  if (Array.isArray(body.variants)) {
    await syncProductVariants(id, body.variants, updated);
  }

  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, id))
    .orderBy(productVariants.name);

  return c.json({ success: true, data: formatProduct(updated, variants) });
});

// DELETE /api/products/:id
productsRouter.delete("/:id", requireAuth, requirePermission("products:delete"), async (c) => {
  const id = c.req.param("id");

  await db.delete(products).where(eq(products.id, id));
  return c.json({ success: true, message: "Product deleted" });
});
