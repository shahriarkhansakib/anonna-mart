import { apiFetch } from "../api-client";

export interface UserProfileItem {
  id: string;
  user_id: string;
  full_name: string;
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
  user_roles?: { role: string }[];
  orders_count?: number;
  total_spent?: number;
  created_at: string;
}

export const usersApi = {
  list: () =>
    apiFetch<{
      success: boolean;
      data: UserProfileItem[];
      users: UserProfileItem[];
      totalCount: number;
    }>("/api/users"),
  get: (id: string) =>
    apiFetch<{
      success: boolean;
      data: UserProfileItem & {
        profile: UserProfileItem;
        orders: any[];
        notes: any[];
        credits: any[];
      };
    }>(`/api/users/${id}`),
  update: (id: string, data: Partial<UserProfileItem>) =>
    apiFetch<{ success: boolean; data: UserProfileItem }>(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
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
    apiFetch<{ success: boolean; data: any }>(`/api/users/${userId}/credits`, {
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
