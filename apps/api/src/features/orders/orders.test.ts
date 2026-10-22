import { db, products } from "@growmate/db";
import { describe, expect, it } from "vitest";
import app from "../../index";

describe("Orders & Storefront Checkout Engine API", () => {
  it("POST /api/orders should successfully create a storefront checkout order", async () => {
    // Retrieve an existing product from seeded DB to satisfy foreign key constraint
    const [prod] = await db.select({ id: products.id }).from(products).limit(1);

    const res = await app.request("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: "Sakib Customer",
        customerPhone: "01711223344",
        customerEmail: "customer@anonna.com",
        shippingAddress: "House 24, Road 5, Dhanmondi, Dhaka",
        paymentMethod: "cod",
        deliveryFee: 60,
        subtotal: 1200,
        totalAmount: 1260,
        discountAmount: 0,
        items: prod
          ? [
              {
                productId: prod.id,
                name: "Pure Mustard Oil 1L",
                quantity: 2,
                price: 600,
                unitPrice: 600,
                totalPrice: 1200,
              },
            ]
          : [],
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("id");
    expect(body.data.customer_name).toBe("Sakib Customer");
    expect(body.data.total_amount).toBe(1260);
    expect(body.data.payment_method).toBe("cod");
  });

  it("POST /api/orders/:id/accept without admin auth should return 401", async () => {
    const res = await app.request("/api/orders/order-1234/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackingId: "STF-999" }),
    });

    expect(res.status).toBe(401);
  });

  it("POST /api/orders/:id/reject without admin auth should return 401", async () => {
    const res = await app.request("/api/orders/order-1234/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Out of stock" }),
    });

    expect(res.status).toBe(401);
  });

  it("POST /api/orders/bulk-status without admin auth should return 401", async () => {
    const res = await app.request("/api/orders/bulk-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ["order-1"], status: "shipped" }),
    });

    expect(res.status).toBe(401);
  });
});
