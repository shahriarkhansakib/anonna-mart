import { describe, expect, it } from "vitest";
import {
  toolGetDeliveryRates,
  toolGetOrderStatus,
  toolGetStorePolicies,
  toolSearchProducts,
} from "./ai-support.service";

describe("AI Support Deterministic Tools", () => {
  it("searches active products from live PostgreSQL catalog", async () => {
    const res = await toolSearchProducts({ query: "cat", inStockOnly: true });
    expect(res.success).toBe(true);
    expect(Array.isArray(res.products)).toBe(true);
  });

  it("retrieves delivery rates from live delivery_zones table", async () => {
    const res = await toolGetDeliveryRates();
    expect(res.success).toBe(true);
    expect(res.zones.length).toBeGreaterThan(0);
  });

  it("retrieves official store policies", () => {
    const res = toolGetStorePolicies({ topic: "returns" });
    expect(res.policy).toContain("7-day");
  });

  it("handles order status lookups safely without IDOR", async () => {
    const res = await toolGetOrderStatus("non-existent-user-id", {});
    expect(res.found).toBe(false);
  });
});
