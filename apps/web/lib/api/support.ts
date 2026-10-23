import { apiFetch } from "../api-client";

export interface SupportConversationItem {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  profile?: {
    full_name: string;
    email: string | null;
  };
}

export interface SupportMessageItem {
  id: string;
  conversation_id: string;
  sender_type: "customer" | "agent" | "system";
  sender_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const supportApi = {
  listConversations: () =>
    apiFetch<{ success: boolean; data: SupportConversationItem[] }>("/api/support/conversations"),

  createConversation: (data: {
    customer_name?: string;
    customer_email?: string;
    user_id?: string;
  }) =>
    apiFetch<{ success: boolean; data: SupportConversationItem }>("/api/support/conversations", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateConversation: (id: string, data: { status?: string }) =>
    apiFetch<{ success: boolean; data: SupportConversationItem }>(
      `/api/support/conversations/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    ),

  deleteConversation: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/support/conversations/${id}`, {
      method: "DELETE",
    }),

  getMessages: (conversationId: string) =>
    apiFetch<{ success: boolean; data: SupportMessageItem[] }>(
      `/api/support/conversations/${conversationId}/messages`,
    ),

  sendMessage: (
    conversationId: string,
    message: string,
    senderType: "customer" | "agent" = "agent",
    senderId?: string,
  ) =>
    apiFetch<{ success: boolean; data: SupportMessageItem }>(
      `/api/support/conversations/${conversationId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ message, sender_type: senderType, sender_id: senderId }),
      },
    ),

  markRead: (conversationId: string) =>
    apiFetch<{ success: boolean }>(`/api/support/conversations/${conversationId}/read`, {
      method: "POST",
    }),

  sendAIChat: (data: { message: string; conversationId?: string }) =>
    apiFetch<{
      success: boolean;
      data: {
        conversationId: string;
        message: SupportMessageItem;
        products?: Array<{
          id: string;
          name: string;
          price: number;
          original_price?: number;
          discount_percent?: number;
          in_stock: boolean;
          stock_quantity: number;
          badge?: string;
          category?: string;
          image?: string;
        }>;
      };
    }>("/api/support/ai-chat", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
