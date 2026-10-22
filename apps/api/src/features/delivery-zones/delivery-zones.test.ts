import { describe, expect, it } from "vitest";
import app from "../../index";

describe("Delivery Zones & Logistics API Suite", () => {
  it("GET /api/delivery-zones should return active shipping zones for storefront checkout", async () => {
    const res = await app.request("/api/delivery-zones");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("POST /api/delivery-zones without admin authorization should return 401", async () => {
    const res = await app.request("/api/delivery-zones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zone_name: "Illegal Zone",
        charge: 50,
      }),
    });

    expect(res.status).toBe(401);
  });

  it("DELETE /api/delivery-zones/:id without admin authorization should return 401", async () => {
    const res = await app.request("/api/delivery-zones/zone-id-1234", {
      method: "DELETE",
    });

    expect(res.status).toBe(401);
  });
});
