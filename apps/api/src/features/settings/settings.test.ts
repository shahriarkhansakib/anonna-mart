import { describe, expect, it } from "vitest";
import app from "../../index";

describe("Store Settings & Configuration API", () => {
  it("GET /api/settings should return public store configuration without sensitive connectors", async () => {
    const res = await app.request("/api/settings");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("storeSettings");
    expect(body.data).toHaveProperty("shippingSettings");
    // Sensitive connectors must be empty object for public unauthenticated requests
    expect(Object.keys(body.data.connectors || {})).toHaveLength(0);
  });

  it("POST /api/settings without admin credentials should be rejected with 401", async () => {
    const res = await app.request("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "store_settings",
        value: { name: "Hacked Store Name" },
      }),
    });

    expect(res.status).toBe(401);
  });
});
