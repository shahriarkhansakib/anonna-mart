import { apiFetch } from "../api-client";

export interface UserProfileItem {
  id: string;
  user_id: string;
  full_name: string;
  name?: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  address?: string | null;
  division?: string | null;
  district?: string | null;
  thana?: string | null;
  banned?: boolean;
  ban_reason?: string | null;
  role: string;
  roles?: string[];
  user_roles?: { role: string }[];
  order_count?: number;
  orders_count?: number;
  total_spent?: number;
  last_order_date?: string | null;
  last_payment_status?: string;
  last_payment_method?: string;
  store_credit_balance?: number;
  segment?: "vip" | "high_spender" | "at_risk" | "new" | string;
  created_at: string;
}

export interface CustomerListResponse {
  success: boolean;
  data: UserProfileItem[];
  users: UserProfileItem[];
  stats?: {
    totalCustomers: number;
    totalSales: number;
    paidSales: number;
    pendingSales: number;
    avgLtv: number;
    totalCreditsOutstanding: number;
  };
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  totalCount: number;
}

export const usersApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    segment?: string;
    payment?: string;
    sortBy?: string;
    order?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.search) q.set("search", params.search);
    if (params?.segment && params.segment !== "all") q.set("segment", params.segment);
    if (params?.payment && params.payment !== "all") q.set("payment", params.payment);
    if (params?.sortBy) q.set("sortBy", params.sortBy);
    if (params?.order) q.set("order", params.order);
    const qs = q.toString();
    return apiFetch<CustomerListResponse>(qs ? `/api/users?${qs}` : "/api/users");
  },
  get: (id: string) =>
    apiFetch<{
      success: boolean;
      data: UserProfileItem & {
        profile: UserProfileItem;
        orders: any[];
        notes: any[];
        customer_notes?: any[];
        credits: any[];
        store_credits?: any[];
        balance?: number;
        store_credit_balance?: number;
      };
    }>(`/api/users/${id}`),
  update: (id: string, data: Partial<UserProfileItem>) =>
    apiFetch<{ success: boolean; data: UserProfileItem }>(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  ban: (userId: string, reason?: string) =>
    apiFetch<{ success: boolean; message: string; data: UserProfileItem }>(
      `/api/users/${userId}/ban`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    ),
  unban: (userId: string) =>
    apiFetch<{ success: boolean; message: string; data: UserProfileItem }>(
      `/api/users/${userId}/unban`,
      {
        method: "POST",
      },
    ),
  addNote: (userId: string, content: string, authorId?: string) =>
    apiFetch<{ success: boolean; data: any }>(`/api/users/${userId}/notes`, {
      method: "POST",
      body: JSON.stringify({ content, author_id: authorId }),
    }),
  deleteNote: (userId: string, noteId: string) =>
    apiFetch<{ success: boolean }>(`/api/users/${userId}/notes/${noteId}`, {
      method: "DELETE",
    }),
  addCredit: (userId: string, amount: number, reason: string, createdBy?: string) =>
    apiFetch<{ success: boolean; data: any; balance?: number }>(`/api/users/${userId}/credits`, {
      method: "POST",
      body: JSON.stringify({ amount, reason, created_by: createdBy }),
    }),
  getCredits: () =>
    apiFetch<{
      success: boolean;
      data: Array<{
        id: string;
        customer_user_id: string;
        amount: number;
        reason: string;
        created_at: string;
      }>;
    }>("/api/users/credits"),
};
