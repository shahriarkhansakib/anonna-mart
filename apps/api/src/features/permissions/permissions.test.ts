import { describe, expect, it } from "vitest";
import app from "../../index";

describe("PBAC Dynamic Permissions API Suite", () => {
  it("GET /api/permissions/me without authentication should return 401 Unauthorized", async () => {
    const res = await app.request("/api/permissions/me");
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });
});
