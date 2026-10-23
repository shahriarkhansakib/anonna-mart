# Skill: Testing & Quality Assurance

## 🎯 Purpose
Guidelines for authoring comprehensive test suites, executing stress tests, and maintaining the 100% test pass rate across `apps/api`.

---

## 🧪 1. Testing Framework: Vitest
The API test suite uses [Vitest](https://vitest.dev/) with direct Hono `app.request()` dispatch (super-fast, in-memory HTTP requests without spinning up a real TCP socket).

### Running Tests:
```bash
# Run all API tests
pnpm.cmd --filter @growmate/api test

# Run a specific test file
pnpm.cmd --filter @growmate/api exec vitest run src/features/orders/orders.test.ts
```

---

## 📝 2. Writing Feature Integration Tests
Every feature route should have corresponding test coverage verifying:
1. **Public endpoints:** Accessible without authentication (e.g. `GET /api/products`).
2. **Protected endpoints:** Rejects unauthenticated calls with `401 Unauthorized`.
3. **Forbidden endpoints:** Rejects non-admin or unauthorized calls with `403 Forbidden`.
4. **Validation failures:** Rejects malformed JSON with `400 Bad Request`.
5. **Happy path:** Successfully creates/modifies records with `200` or `201`.

### Example Test Structure:
```ts
import { describe, it, expect } from "vitest";
import { app } from "../../server";

describe("Products API", () => {
  it("GET /api/products returns active products list", async () => {
    const res = await app.request("/api/products");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("POST /api/products rejects unauthenticated requests with 401", async () => {
    const res = await app.request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Hacked Product" }),
    });
    expect(res.status).toBe(401);
  });
});
```

---

## 💥 3. High-Concurrency Stress Testing
The API includes an automated stress testing suite under `apps/api/src/features/stress/api-stress.test.ts`.

It runs bursts of parallel requests across:
* Health checks
* Catalog endpoints
* Coupon voucher validations
* Incomplete order recovery endpoints

When modifying core middleware, rate limits, or database queries, **always execute the stress test suite** to verify zero race conditions and sub-100ms response latencies.
