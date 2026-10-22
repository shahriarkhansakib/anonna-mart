import { describe, expect, it } from "vitest";
import app from "../../index";

describe("Customer Support & Live Chat API Suite", () => {
  let createdConvId: string;

  it("GET /api/support/conversations should return list of customer conversations", async () => {
    const res = await app.request("/api/support/conversations");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("POST /api/support/conversations should allow customer to initiate support chat", async () => {
    const res = await app.request("/api/support/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: "Test Support User",
        customerEmail: "support.test@anonna-mart.com",
        status: "open",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.customer_name).toBe("Test Support User");
    expect(body.data.id).toBeDefined();
    createdConvId = body.data.id;
  });

  it("POST /api/support/conversations/:id/messages should send a message into thread", async () => {
    if (!createdConvId) return;

    const res = await app.request(`/api/support/conversations/${createdConvId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderType: "customer",
        message: "Hello, I have an inquiry about my order.",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.message).toBe("Hello, I have an inquiry about my order.");
  });

  it("GET /api/support/conversations/:id/messages should fetch thread messages", async () => {
    if (!createdConvId) return;

    const res = await app.request(`/api/support/conversations/${createdConvId}/messages`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("PATCH /api/support/conversations/:id should update ticket/conversation status", async () => {
    if (!createdConvId) return;

    const res = await app.request(`/api/support/conversations/${createdConvId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "resolved",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("resolved");
  });

  it("DELETE /api/support/conversations/:id should remove conversation", async () => {
    if (!createdConvId) return;

    const res = await app.request(`/api/support/conversations/${createdConvId}`, {
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
