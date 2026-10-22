import { randomUUID } from "node:crypto";
import { categories, db, products, productVariants } from "@growmate/db";
import { desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { requireAuth } from "../../infra/middleware/auth";
import { requirePermission } from "../../infra/middleware/require-permission";

export const productsRouter = new Hono();


// Helper to format product for UI (provides both camelCase and snake_case compatibility)
function formatProduct(p: any) {
  if (!p) return p;
  const imageUrl = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : (p.imageUrl || null);
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
    created_at: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
    updated_at: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
  };
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

// DELETE /api/products/categories/:id
productsRouter.delete("/categories/:id", requireAuth, requirePermission("products:delete"), async (c) => {
  const id = c.req.param("id");
  await db.delete(categories).where(eq(categories.id, id));
  return c.json({ success: true, message: "Category deleted" });
});

// POST /api/products/batch-stock (bulk stock updates from Admin Inventory)
productsRouter.post("/batch-stock", requireAuth, requirePermission("products:edit"), async (c) => {
  const { updates } = await c.req.json(); // array of { id: string, stock: number }

  if (!Array.isArray(updates)) {
    return c.json({ success: false, error: "Invalid updates format" }, 400);
  }

  for (const item of updates) {
    await db
      .update(products)
      .set({
        stockQuantity: Number(item.stock),
        updatedAt: new Date(),
      })
      .where(eq(products.id, item.id));
  }

  return c.json({ success: true, count: updates.length });
});

// GET /api/products
productsRouter.get("/", async (c) => {
  const query = c.req.query("search");
  const categoryId = c.req.query("categoryId");

  let items = await db.select().from(products).orderBy(desc(products.createdAt));

  if (query) {
    const q = query.toLowerCase();
    items = items.filter(
      (p: any) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.productType && p.productType.toLowerCase().includes(q)),
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
  return c.json({ success: true, data: formatProduct(product) });
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

  // Ensure categoryId exists or fallback
  let categoryId = body.categoryId || body.category;
  if (!categoryId) {
    const [firstCat] = await db.select().from(categories).limit(1);
    categoryId = firstCat ? firstCat.id : "cat-dog";
  }

  const stock = body.stock !== undefined ? Number(body.stock) : Number(body.stockQuantity || 0);
  const originalPrice = body.compare_price !== undefined ? Number(body.compare_price) : body.originalPrice !== undefined ? Number(body.originalPrice) : null;

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

  if (body.lowStockThreshold !== undefined) updateData.lowStockThreshold = Number(body.lowStockThreshold);
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

  if (body.categoryId) updateData.categoryId = body.categoryId;
  else if (body.category) updateData.categoryId = body.category;

  const [updated] = await db
    .update(products)
    .set(updateData)
    .where(eq(products.id, id))
    .returning();

  return c.json({ success: true, data: formatProduct(updated) });
});

// DELETE /api/products/:id
productsRouter.delete("/:id", requireAuth, requirePermission("products:delete"), async (c) => {
  const id = c.req.param("id");

  await db.delete(products).where(eq(products.id, id));
  return c.json({ success: true, message: "Product deleted" });
});
