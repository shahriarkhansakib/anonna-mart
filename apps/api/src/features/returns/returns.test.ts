import { db, orders } from "@growmate/db";
import { describe, expect, it } from "vitest";
import app from "../../index";

describe("Returns & Reverse Logistics API Suite", () => {
  it("GET /api/returns should return list of return requests", async () => {
    const res = await app.request("/api/returns");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("POST /api/returns with non-existent orderId should enforce relational integrity", async () => {
    const res = await app.request("/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: "non-existent-order-id-9999",
        reason: "Defective item upon arrival",
        refund_amount: 500,
        items: [{ id: "item-1", name: "Organic Mustard Oil", quantity: 1 }],
      }),
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal Server Error");
  });

  it("POST /api/returns with valid existing order should create return claim", async () => {
    const [existingOrder] = await db.select({ id: orders.id }).from(orders).limit(1);

    if (existingOrder) {
      const res = await app.request("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: existingOrder.id,
          reason: "Defective item upon arrival",
          refund_amount: 500,
          items: [{ id: "item-1", name: "Organic Mustard Oil", quantity: 1 }],
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("id");
      expect(body.data.reason).toBe("Defective item upon arrival");
    }
  });
});
