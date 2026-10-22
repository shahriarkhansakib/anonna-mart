import { describe, expect, it } from "vitest";
import app from "../../index";

describe("Incomplete Orders & Abandoned Cart Recovery API", () => {
  it("POST /api/incomplete-orders should successfully capture checkout lead", async () => {
    const res = await app.request("/api/incomplete-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerPhone: "01700000000",
        customerName: "Lead Tester",
        customerEmail: "lead@anonna.com",
        currentStep: "payment_selected",
        cartTotal: 1250,
        items: [
          {
            name: "Premium Honey Jar",
            price: 650,
            quantity: 1,
          },
        ],
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("id");
  });

  it("GET /api/incomplete-orders should return captured leads list", async () => {
    const res = await app.request("/api/incomplete-orders");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});
