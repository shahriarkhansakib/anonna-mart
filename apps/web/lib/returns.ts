export type ReturnStatus = "requested" | "approved" | "received" | "completed" | "rejected";

export interface ReturnItem {
  product_id?: string | null;
  name: string;
  price: number;
  quantity: number;
  variant?: string;
}

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  received: "Received",
  completed: "Completed",
  rejected: "Rejected",
};

export const RETURN_REASONS = [
  "Damaged item",
  "Wrong item sent",
  "Size / fit issue",
  "Not as described",
  "Changed mind",
  "Other",
];

/** Allowed next steps for a return in each status. */
export function nextReturnStatuses(status: ReturnStatus): ReturnStatus[] {
  switch (status) {
    case "requested":
      return ["approved", "rejected"];
    case "approved":
      return ["received", "rejected"];
    case "received":
      return ["completed"];
    default:
      return [];
  }
}

/** Sum of price × quantity for the items being returned. */
export function returnItemsTotal(items: ReturnItem[]): number {
  return items.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 0), 0);
}

/** Returns an error message or null. Refund can never exceed the order total. */
export function validateReturn(input: {
  reason: string;
  items: ReturnItem[];
  refund: number;
  orderTotal: number;
}): string | null {
  if (!input.reason.trim()) return "Choose a reason";
  if (!input.items.length || input.items.every((i) => i.quantity <= 0))
    return "Select at least one item";
  if (!Number.isFinite(input.refund) || input.refund < 0) return "Refund cannot be negative";
  if (input.refund > input.orderTotal) return "Refund cannot be more than the order total";
  return null;
}
