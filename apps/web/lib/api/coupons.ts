import { apiFetch } from "../api-client";

export interface CouponItem {
  id: string;
  code: string;
  description?: string | null;
  discountType: "percentage" | "fixed";
  discount_type?: "percentage" | "fixed" | string;
  discountValue: number;
  discount_value?: number;
  minSpend?: number | null;
  min_order_amount?: number | null;
  minOrderAmount?: number | null;
  maxDiscount?: number | null;
  max_discount_amount?: number | null;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  usage_limit?: number | null;
  used_count?: number;
  isActive: boolean;
  is_active?: boolean;
  startsAt?: string | null;
  starts_at?: string | null;
  expiresAt?: string | null;
  expires_at?: string | null;
  createdAt?: string;
  created_at?: string;
}

export const couponsApi = {
  list: () => apiFetch<{ success: boolean; data: CouponItem[] }>("/api/coupons"),
  create: (data: Partial<CouponItem>) =>
    apiFetch<{ success: boolean; data: CouponItem }>("/api/coupons", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<CouponItem>) =>
    apiFetch<{ success: boolean; data: CouponItem }>(`/api/coupons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/api/coupons/${id}`, {
      method: "DELETE",
    }),
  validate: (code: string, cartTotal: number) =>
    apiFetch<{
      success: boolean;
      data: { code: string; discountAmount: number; discountType: string };
    }>("/api/coupons/validate", {
      method: "POST",
      body: JSON.stringify({ code, cartTotal }),
    }),
};
