import { describe, expect, it } from "vitest";
import app from "../../index";

describe("Analytics & Business Intelligence Security Suite", () => {
  it("GET /api/analytics/dashboard-stats should reject unauthenticated requests with 401", async () => {
    const res = await app.request("/api/analytics/dashboard-stats");
    expect(res.status).toBe(401);
  });

  it("GET /api/analytics/orders-chart should reject unauthorized access", async () => {
    const res = await app.request("/api/analytics/orders-chart");
    expect(res.status).toBe(401);
  });

  it("GET /api/analytics/top-products should reject unauthorized access", async () => {
    const res = await app.request("/api/analytics/top-products");
    expect(res.status).toBe(401);
  });
});
