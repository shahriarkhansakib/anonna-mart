import { describe, expect, it } from "vitest";
import app from "../../index";

describe("CMS & Content Management API Suite", () => {
  it("GET /api/cms/articles should return list of articles with pagination/count", async () => {
    const res = await app.request("/api/cms/articles");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.count).toBe("number");
  });

  it("GET /api/cms/articles with category and published filter should respond 200", async () => {
    const res = await app.request("/api/cms/articles?category=nutrition&published=true");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("GET /api/cms/articles/:id for nonexistent article should return 404", async () => {
    const res = await app.request("/api/cms/articles/nonexistent-article-id-9999");
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Article not found");
  });

  it("POST /api/cms/articles without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/cms/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Unauthorized Article Attempt",
        content: "Draft content",
        category: "nutrition",
      }),
    });

    expect(res.status).toBe(401);
  });

  it("PATCH /api/cms/articles/:id without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/cms/articles/article-123", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Updated Title",
      }),
    });

    expect(res.status).toBe(401);
  });

  it("DELETE /api/cms/articles/:id without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/cms/articles/article-123", {
      method: "DELETE",
    });

    expect(res.status).toBe(401);
  });
});
