import { describe, expect, it } from "vitest";
import app from "../../index";

describe("Coupons Engine & Validation API Suite", () => {
  it("POST /api/coupons/validate with missing code should return 400 Bad Request", async () => {
    const res = await app.request("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cartTotal: 1500 }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Coupon code is required");
  });

  it("POST /api/coupons/validate with nonexistent coupon code should return 400", async () => {
    const res = await app.request("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "FAKE_COUPON_CODE_9999", cartTotal: 2000 }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Invalid or expired coupon");
  });

  it("GET /api/coupons without auth should return 401 Unauthorized", async () => {
    const res = await app.request("/api/coupons");
    expect(res.status).toBe(401);
  });

  it("POST /api/coupons without admin credentials should return 401", async () => {
    const res = await app.request("/api/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "UNAUTHORIZED10",
        discountType: "percentage",
        discountValue: 10,
      }),
    });

    expect(res.status).toBe(401);
  });
});
