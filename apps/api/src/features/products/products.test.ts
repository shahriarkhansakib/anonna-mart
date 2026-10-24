import { describe, expect, it } from "vitest";
import app from "../../index";

describe("Products & Categories API Suite", () => {
  it("GET /api/products/categories/all should return active category catalog", async () => {
    const res = await app.request("/api/products/categories/all");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    if (body.data.length > 0) {
      expect(body.data[0]).toHaveProperty("id");
      expect(body.data[0]).toHaveProperty("name");
      expect(body.data[0]).toHaveProperty("slug");
    }
  });

  it("GET /api/products should return catalog with product items", async () => {
    const res = await app.request("/api/products");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("GET /api/products/:id with nonexistent ID should return 404", async () => {
    const res = await app.request("/api/products/non-existent-product-id-99999");
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Product not found");
  });

  it("POST /api/products without admin credentials should be rejected with 401", async () => {
    const res = await app.request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Malicious Product",
        price: 100,
      }),
    });

    expect(res.status).toBe(401);
  });

  it("POST /api/products/categories without authorization should be rejected with 401", async () => {
    const res = await app.request("/api/products/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Unauthorized Category",
      }),
    });

    expect(res.status).toBe(401);
  });

  it("GET /api/products/:id/variants should return variant list for a product", async () => {
    // First get a product from catalog
    const prodRes = await app.request("/api/products");
    const prodBody = await prodRes.json();
    const productId = prodBody.data?.[0]?.id || "non-existent-product";

    const res = await app.request(`/api/products/${productId}/variants`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("PUT /api/products/:id/variants without authorization should be rejected with 401", async () => {
    const res = await app.request("/api/products/prod-12345/variants", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variants: [{ name: "500g Pack", sku: "PACK-500G", price: 250, stockQuantity: 20 }],
      }),
    });

    expect(res.status).toBe(401);
  });
});
