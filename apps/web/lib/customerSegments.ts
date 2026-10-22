export type Segment = "vip" | "high_spender" | "at_risk" | "new";

export const SEGMENT_LABELS: Record<Segment, string> = {
  vip: "VIP",
  high_spender: "High Spender",
  at_risk: "At Risk",
  new: "New",
};

export const VIP_MIN_ORDERS = 4; // "more than 3 orders"
export const AT_RISK_DAYS = 60;
export const HIGH_SPENDER_MIN = 10000;

const DAY = 86_400_000;

export function customerSegments(
  c: { order_count: number; total_spent: number; last_order_date: string | null },
  now: Date = new Date(),
  highSpenderMin = HIGH_SPENDER_MIN,
): Segment[] {
  const out: Segment[] = [];
  if (c.order_count >= VIP_MIN_ORDERS) out.push("vip");
  if (c.total_spent >= highSpenderMin) out.push("high_spender");
  if (c.order_count > 0 && c.last_order_date) {
    const days = (now.getTime() - new Date(c.last_order_date).getTime()) / DAY;
    if (days > AT_RISK_DAYS) out.push("at_risk");
    else if (c.order_count === 1) out.push("new");
  }
  return out;
}

export function creditBalance(entries: { amount: number | string }[]) {
  return entries.reduce((s, e) => s + Number(e.amount), 0);
}

/** Positive grants any amount; deductions may not take balance below zero. */
export function validateCredit(amount: number, balance: number, reason: string): string | null {
  if (!Number.isFinite(amount) || amount === 0) return "Enter an amount other than zero";
  if (!reason.trim()) return "Add a reason";
  if (balance + amount < 0) return "Balance cannot go below zero";
  return null;
}
