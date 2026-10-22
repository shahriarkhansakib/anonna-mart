import { apiFetch } from "../api-client";

export interface IncompleteOrderItem {
  id: string;
  customerName: string;
  customer_name?: string;
  customerPhone: string;
  customer_phone?: string;
  customerEmail?: string | null;
  customer_email?: string | null;
  shippingAddress?: string | null;
  shipping_address?: string | null;
  items: any[];
  totalAmount: number;
  total_amount?: number;
  cart_total?: number;
  division?: string | null;
  order?: any;
  status: string;
  notes?: string | null;
  recoveredAt?: string | null;
  recovered_at?: string | null;
  createdAt: string;
  created_at?: string;
  [key: string]: any;
}

export const incompleteOrdersApi = {
  list: () => apiFetch<{ success: boolean; data: IncompleteOrderItem[] }>("/api/incomplete-orders"),
  update: (id: string, data: any) =>
    apiFetch<{ success: boolean; data: IncompleteOrderItem }>(`/api/incomplete-orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/api/incomplete-orders/${id}`, {
      method: "DELETE",
    }),
};
