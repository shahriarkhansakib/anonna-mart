import { describe, expect, it } from "vitest";
import app from "../../index";

describe("Returns & Reverse Logistics API Suite", () => {
  it("GET /api/returns without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/returns");
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("POST /api/returns without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: "order-1234",
        reason: "Defective item upon arrival",
        refund_amount: 500,
        items: [{ id: "item-1", name: "Organic Mustard Oil", quantity: 1 }],
      }),
    });

    expect(res.status).toBe(401);
  });

  it("GET /api/returns/:id without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/returns/ret-1234");
    expect(res.status).toBe(401);
  });

  it("PATCH /api/returns/:id without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/returns/ret-1234", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });

    expect(res.status).toBe(401);
  });

  it("POST /api/returns/:id/restock without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/returns/ret-1234/restock", {
      method: "POST",
    });

    expect(res.status).toBe(401);
  });

  it("DELETE /api/returns/:id without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/returns/ret-1234", {
      method: "DELETE",
    });

    expect(res.status).toBe(401);
  });
});
