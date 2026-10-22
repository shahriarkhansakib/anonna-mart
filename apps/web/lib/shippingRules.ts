export interface ShippingRule {
  id: string;
  name: string;
  zoneId: string;
  basis: "weight" | "value";
  min: number;
  max: number | null;
  charge: number;
  active: boolean;
}

/** First matching rule wins; lower bound inclusive, upper bound exclusive. */
export function shippingQuote(
  rules: ShippingRule[],
  zoneId: string,
  weight: number,
  value: number,
  fallback: number,
) {
  const rule = rules.find(
    (r) =>
      r.active &&
      (!r.zoneId || r.zoneId === zoneId) &&
      (r.basis === "weight" ? weight : value) >= r.min &&
      (r.max === null || (r.basis === "weight" ? weight : value) < r.max),
  );
  return { charge: rule?.charge ?? fallback, rule };
}

export function trackingURL(template: string, code: string): string | null {
  if (!template.trim()) return null;
  const url = new URL(template.trim().replaceAll("{tracking}", encodeURIComponent(code.trim())));
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("Tracking URL must use HTTPS without login details");
  return url.href;
}

export function validateShippingRule(r: ShippingRule): boolean {
  return (
    !!r.name.trim() &&
    ["weight", "value"].includes(r.basis) &&
    Number.isFinite(r.min) &&
    r.min >= 0 &&
    Number.isFinite(r.charge) &&
    r.charge >= 0 &&
    (r.max === null || (Number.isFinite(r.max) && r.max > r.min))
  );
}
