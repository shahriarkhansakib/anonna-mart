import { apiFetch } from "../api-client";

export interface OrderReturnItem {
  id: string;
  order_id: string;
  orderId?: string;
  customer_user_id: string;
  customerUserId?: string;
  kind: string;
  status: string;
  reason: string;
  items: any;
  refund_amount: number;
  refundAmount?: number;
  refund_method: string;
  refundMethod?: string;
  restock: boolean;
  restocked: boolean;
  notes: string | null;
  created_at: string;
  createdAt?: string;
}

export const returnsApi = {
  list: () =>
    apiFetch<{ success: boolean; data: OrderReturnItem[] }>("/api/returns"),

  create: (data: Partial<OrderReturnItem> & Record<string, any>) =>
    apiFetch<{ success: boolean; data: OrderReturnItem }>("/api/returns", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<OrderReturnItem> & Record<string, any>) =>
    apiFetch<{ success: boolean; data: OrderReturnItem }>(`/api/returns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};
