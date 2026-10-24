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
  updated_at?: string;
  customer?: {
    id: string;
    name: string;
    full_name?: string;
    email: string;
    phone?: string | null;
    avatar_url?: string | null;
  } | null;
  order?: {
    id: string;
    status: string;
    total_amount: number;
    payment_status: string;
    payment_method: string;
    shipping_address?: any;
  } | null;
}

export interface ReturnsListResponse {
  success: boolean;
  data: OrderReturnItem[];
  stats?: {
    pending: number;
    awaiting: number;
    received: number;
    completed: number;
    exchanges: number;
    refunded: number;
  };
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const returnsApi = {
  list: (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.status && params.status !== "all") q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    const qs = q.toString();
    return apiFetch<ReturnsListResponse>(qs ? `/api/returns?${qs}` : "/api/returns");
  },

  get: (id: string) => apiFetch<{ success: boolean; data: OrderReturnItem }>(`/api/returns/${id}`),

  create: (data: Partial<OrderReturnItem> & Record<string, any>) =>
    apiFetch<{ success: boolean; data: OrderReturnItem }>("/api/returns", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<OrderReturnItem> & Record<string, any>) =>
    apiFetch<{ success: boolean; data: OrderReturnItem; restocked?: boolean }>(
      `/api/returns/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    ),

  restock: (id: string) =>
    apiFetch<{ success: boolean; message: string; data: OrderReturnItem }>(
      `/api/returns/${id}/restock`,
      {
        method: "POST",
      },
    ),

  remove: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/api/returns/${id}`, {
      method: "DELETE",
    }),
};
