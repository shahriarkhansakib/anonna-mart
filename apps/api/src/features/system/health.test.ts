import { describe, expect, it } from "vitest";
import app from "../../index";

describe("System & HTTP Infrastructure API", () => {
  it("GET /api/health should return 200 with service status and timestamp", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.service).toBe("growmate-api");
    expect(typeof data.timestamp).toBe("string");
    expect(new Date(data.timestamp).getTime()).not.toBeNaN();
  });

  it("should return structured 404 for nonexistent routes", async () => {
    const res = await app.request("/api/nonexistent-route-endpoint");
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.error).toBe("Not Found");
    expect(data.message).toContain("/api/nonexistent-route-endpoint");
  });

  it("should provide CORS headers on OPTIONS preflight", async () => {
    const res = await app.request("/api/health", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5003",
        "Access-Control-Request-Method": "GET",
      },
    });

    expect(res.headers.get("access-control-allow-origin")).toBeTruthy();
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });
});
