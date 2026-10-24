import { describe, expect, it } from "vitest";
import app from "../../index";

describe("Users & Customer Profiles API Suite", () => {
  it("GET /api/users/me without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/users/me");
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("GET /api/users (staff view) without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/users");
    expect(res.status).toBe(401);
  });

  it("GET /api/customers (alias) without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/customers");
    expect(res.status).toBe(401);
  });

  it("GET /api/users/:id without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/users/some-user-uuid-1234");
    expect(res.status).toBe(401);
  });

  it("PATCH /api/users/:id without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/users/some-user-uuid-1234", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: true, banReason: "Fraudulent chargebacks" }),
    });

    expect(res.status).toBe(401);
  });

  it("POST /api/users/:id/notes without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/users/some-user-uuid-1234/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "VIP Customer preference noted." }),
    });

    expect(res.status).toBe(401);
  });

  it("DELETE /api/users/:id/notes/:noteId without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/users/some-user-uuid-1234/notes/note-5678", {
      method: "DELETE",
    });

    expect(res.status).toBe(401);
  });

  it("POST /api/users/:id/credits without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/users/some-user-uuid-1234/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 500, reason: "Courtesy credit" }),
    });

    expect(res.status).toBe(401);
  });

  it("POST /api/users/:id/ban without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/users/some-user-uuid-1234/ban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Fraud policy violation" }),
    });

    expect(res.status).toBe(401);
  });

  it("POST /api/users/:id/unban without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/users/some-user-uuid-1234/unban", {
      method: "POST",
    });

    expect(res.status).toBe(401);
  });
});
