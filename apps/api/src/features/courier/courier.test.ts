import { describe, expect, it } from "vitest";
import app from "../../index";

describe("Courier & Steadfast Delivery Logistics API", () => {
  it("POST /api/courier/steadfast should process courier dispatch", async () => {
    const res = await app.request("/api/courier/steadfast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoice: "INV-TEST-001",
        recipient_name: "Habib Rahman",
        recipient_phone: "01712345678",
        recipient_address: "Dhanmondi, Dhaka",
        cod_amount: 1450,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe(200);
    expect(body).toHaveProperty("consignment");
    expect(body.consignment).toHaveProperty("consignment_id");
    expect(body.consignment.tracking_code).toMatch(/^STF-/);
    expect(body.consignment.recipient_name).toBe("Habib Rahman");
  });

  it("POST /api/public/fn/steadfast should act as drop-in replacement for invokeFn", async () => {
    const res = await app.request("/api/public/fn/steadfast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoice: "INV-TEST-002",
        recipient_name: "Fatima Khan",
        recipient_phone: "01812345678",
        recipient_address: "Uttara, Dhaka",
        cod_amount: 890,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe(200);
    expect(body.consignment.tracking_code).toBeTruthy();
  });
});
