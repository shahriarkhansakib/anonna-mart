import { randomUUID } from "node:crypto";
import { cmsArticles, db } from "@growmate/db";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { requireAuth } from "../../infra/middleware/auth";
import { requirePermission } from "../../infra/middleware/require-permission";

export const cmsRouter = new Hono();

function formatArticle(a: any) {
  if (!a) return a;
  return {
    ...a,
    cover_image: a.coverImage || a.cover_image || null,
    published_at: a.publishedAt ? new Date(a.publishedAt).toISOString() : null,
    created_at: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
    updated_at: a.updatedAt ? new Date(a.updatedAt).toISOString() : new Date().toISOString(),
  };
}

// GET /api/cms/articles
cmsRouter.get("/articles", async (c) => {
  const category = c.req.query("category");
  const publishedOnly = c.req.query("published") === "true";

  let articles = await db.select().from(cmsArticles).orderBy(desc(cmsArticles.createdAt));

  if (category && category !== "all") {
    articles = articles.filter((a) => a.category === category);
  }
  if (publishedOnly) {
    articles = articles.filter((a) => a.published);
  }

  const formatted = articles.map(formatArticle);
  return c.json({ success: true, data: formatted, count: formatted.length });
});

// GET /api/cms/articles/:id
cmsRouter.get("/articles/:id", async (c) => {
  const id = c.req.param("id");
  const [article] = await db.select().from(cmsArticles).where(eq(cmsArticles.id, id));
  if (!article) {
    return c.json({ success: false, error: "Article not found" }, 404);
  }
  return c.json({ success: true, data: formatArticle(article) });
});

// POST /api/cms/articles
cmsRouter.post("/articles", requireAuth, requirePermission("cms:manage"), async (c) => {
  const body = await c.req.json();
  const id = body.id || randomUUID();
  const slug = body.slug || (body.title || "article").toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const [article] = await db
    .insert(cmsArticles)
    .values({
      id,
      title: body.title || "Untitled Article",
      slug,
      summary: body.summary || null,
      content: body.content || "",
      coverImage: body.coverImage || body.cover_image || null,
      category: (body.category as any) || "nutrition",
      published: body.published ?? true,
      publishedAt: body.published ? new Date() : null,
    })
    .returning();

  return c.json({ success: true, data: formatArticle(article) }, 201);
});

// PATCH /api/cms/articles/:id
cmsRouter.patch("/articles/:id", requireAuth, requirePermission("cms:manage"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const updateData: any = { updatedAt: new Date() };
  if (body.title !== undefined) updateData.title = body.title;
  if (body.slug !== undefined) updateData.slug = body.slug;
  if (body.summary !== undefined) updateData.summary = body.summary;
  if (body.content !== undefined) updateData.content = body.content;
  if (body.coverImage !== undefined || body.cover_image !== undefined) {
    updateData.coverImage = body.coverImage || body.cover_image;
  }
  if (body.category !== undefined) updateData.category = body.category;
  if (body.published !== undefined) {
    updateData.published = !!body.published;
    if (body.published) updateData.publishedAt = new Date();
  }

  const [updated] = await db
    .update(cmsArticles)
    .set(updateData)
    .where(eq(cmsArticles.id, id))
    .returning();

  return c.json({ success: true, data: formatArticle(updated) });
});

// DELETE /api/cms/articles/:id
cmsRouter.delete("/articles/:id", requireAuth, requirePermission("cms:manage"), async (c) => {
  const id = c.req.param("id");
  await db.delete(cmsArticles).where(eq(cmsArticles.id, id));
  return c.json({ success: true });
});

// GET /api/cms/stats
cmsRouter.get("/stats", async (c) => {
  const all = await db.select().from(cmsArticles);
  const total = all.length;
  const published = all.filter((a) => a.published).length;
  const drafts = total - published;

  return c.json({
    success: true,
    data: {
      total,
      published,
      drafts,
      featured: 0,
    },
  });
});
