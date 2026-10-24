import { describe, expect, it } from "vitest";
import app from "../../index";

describe("Customer Support & Live Chat API Suite", () => {
  it("GET /api/support/conversations without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/support/conversations");
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("POST /api/support/conversations without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/support/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: "Test Support User",
        customerEmail: "support.test@anonna-mart.com",
        status: "open",
      }),
    });

    expect(res.status).toBe(401);
  });

  it("GET /api/support/conversations/:id/messages without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/support/conversations/conv-1234/messages");
    expect(res.status).toBe(401);
  });

  it("POST /api/support/conversations/:id/messages without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/support/conversations/conv-1234/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Hello, testing without credentials.",
      }),
    });

    expect(res.status).toBe(401);
  });

  it("DELETE /api/support/conversations/:id without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/support/conversations/conv-1234", {
      method: "DELETE",
    });

    expect(res.status).toBe(401);
  });
});
