import { apiFetch } from "../api-client";

export interface OrderItem {
  id: string;
  orderNumber: string;
  order_number?: string;
  customerName: string;
  customer_name?: string;
  customerEmail: string;
  customer_email?: string;
  customerPhone: string;
  customer_phone?: string;
  shippingAddress: string;
  shipping_address?: string;
  deliveryZoneId?: string | null;
  delivery_zone_id?: string | null;
  subtotal: number;
  shippingFee: number;
  shipping_fee?: number;
  discountAmount: number;
  discount_amount?: number;
  totalAmount: number;
  total_amount?: number;
  status: string;
  paymentStatus: string;
  payment_status?: string;
  paymentMethod: string;
  payment_method?: string;
  trackingCode?: string | null;
  tracking_code?: string | null;
  tracking_id?: string | null;
  courierName?: string | null;
  courier_name?: string | null;
  trackingUrl?: string | null;
  tracking_url?: string | null;
  consignmentId?: string | null;
  consignment_id?: string | null;
  rejectionReason?: string | null;
  rejection_reason?: string | null;
  trashedAt?: string | null;
  trashed_at?: string | null;
  notes?: string | null;
  createdAt: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  items?: any[];
  profile?: {
    full_name: string | null;
    phone: string | null;
    avatar_url?: string | null;
  } | null;
}

export const ordersApi = {
  list: (params?: { status?: string; search?: string; time?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status && params.status !== "all") sp.set("status", params.status);
    if (params?.search) sp.set("search", params.search);
    if (params?.time && params.time !== "all") sp.set("time", params.time);
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return apiFetch<{
      success: boolean;
      data: OrderItem[];
      orders: OrderItem[];
      totalCount: number;
    }>(`/api/orders${qs}`);
  },
  get: (id: string) => apiFetch<{ success: boolean; data: OrderItem }>(`/api/orders/${id}`),
  create: (data: any) =>
    apiFetch<{ success: boolean; data: OrderItem }>("/api/orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    apiFetch<{ success: boolean; data: OrderItem }>(`/api/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  accept: (
    id: string,
    data?: { trackingId?: string; consignmentId?: string; courierName?: string },
  ) =>
    apiFetch<{ success: boolean; data: OrderItem }>(`/api/orders/${id}/accept`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    }),
  reject: (id: string, reason?: string) =>
    apiFetch<{ success: boolean; data: OrderItem }>(`/api/orders/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  bulkStatus: (ids: string[], status: string) =>
    apiFetch<{ success: boolean; count: number }>("/api/orders/bulk-status", {
      method: "POST",
      body: JSON.stringify({ ids, status }),
    }),
  trash: (id: string, restore = false) =>
    apiFetch<{ success: boolean; data: OrderItem }>(`/api/orders/${id}/trash`, {
      method: "PATCH",
      body: JSON.stringify({ restore }),
    }),
  remove: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/api/orders/${id}`, {
      method: "DELETE",
    }),
};
