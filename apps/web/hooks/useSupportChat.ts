import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supportApi } from "@/lib/api/support";

export interface SupportConversation {
  id: string;
  user_id: string;
  status: string;
  subject: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  // Enriched
  user_name?: string;
  user_email?: string;
  unread_count?: number;
  last_message?: string;
  last_sender_role?: string;
}

export interface SupportMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

function mapMessage(m: any): SupportMessage {
  return {
    id: m.id,
    conversation_id: m.conversation_id || m.conversationId,
    sender_id: m.sender_id || m.senderId || "",
    sender_role: m.sender_type === "agent" ? "admin" : m.sender_type || "user",
    content: m.message || m.content || "",
    is_read: !!m.is_read,
    created_at: m.created_at || m.createdAt || new Date().toISOString(),
  };
}

// Hook for customers to manage their support conversation
export const useCustomerSupportChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const initConversation = useCallback(async () => {
    if (!user) return null;
    try {
      const res = await supportApi.listConversations();
      const existing = (res.data || []).find((c) => c.user_id === user.id && c.status !== "closed");
      if (existing) {
        setConversationId(existing.id);
        return existing.id;
      }
      const newConv = await supportApi.createConversation({
        customer_name: (user as any).name || (user as any).full_name || "Customer",
        customer_email: user.email || undefined,
        user_id: user.id,
      });
      setConversationId(newConv.data.id);
      return newConv.data.id;
    } catch {
      return null;
    }
  }, [user]);

  const fetchMessages = useCallback(async (convId: string) => {
    try {
      const res = await supportApi.getMessages(convId);
      if (isMountedRef.current) {
        setMessages((res.data || []).map(mapMessage));
      }
    } catch {
      // ignore
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    initConversation().then((convId) => {
      if (convId) {
        fetchMessages(convId);
      } else {
        setLoading(false);
      }
    });
  }, [user, initConversation, fetchMessages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!user || !conversationId || !content.trim()) return;
      const { sanitizeText, isTextSafe } = await import("@/lib/sanitize");
      const sanitized = sanitizeText(content, { maxLength: 2000 });
      if (!sanitized || !isTextSafe(sanitized)) return;

      try {
        await supportApi.sendMessage(conversationId, sanitized, "customer", user.id);
        fetchMessages(conversationId);
      } catch {
        // ignore
      }
    },
    [user, conversationId, fetchMessages],
  );

  return { messages, loading, sendMessage, conversationId };
};

// Hook for admin to manage all support conversations
export const useAdminSupportChat = () => {
  const { user } = useAuth();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["admin-support-conversations"],
    queryFn: async () => {
      const res = await supportApi.listConversations();
      return (res.data || []).map((c: any) => ({
        id: c.id,
        user_id: c.user_id || c.userId || "",
        status: c.status || "open",
        subject: c.customer_name || "Support Request",
        last_message_at: c.last_message_at || c.updated_at,
        created_at: c.created_at,
        updated_at: c.updated_at,
        user_name: c.customer_name || c.profile?.full_name || "Customer",
        user_email: c.customer_email || c.profile?.email || "",
        unread_count: c.unread_count || 0,
        last_message: c.last_message || "",
        last_sender_role: "user",
      })) as SupportConversation[];
    },
    enabled: !!user,
    staleTime: 1000 * 5,
    refetchInterval: 1000 * 10,
  });

  return { conversations, loading: isLoading };
};

// Hook for admin to view/send messages in a specific conversation
export const useAdminSupportMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    try {
      const res = await supportApi.getMessages(conversationId);
      if (isMountedRef.current) {
        setMessages((res.data || []).map(mapMessage));
      }
      await supportApi.markRead(conversationId).catch(() => null);
    } catch {
      // ignore
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    fetchMessages();

    if (!conversationId) return;
    const interval = setInterval(() => {
      fetchMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [conversationId, fetchMessages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!user || !conversationId || !content.trim()) return;

      const { sanitizeText, isTextSafe } = await import("@/lib/sanitize");
      const sanitized = sanitizeText(content, { maxLength: 2000 });
      if (!sanitized || !isTextSafe(sanitized)) return;

      try {
        await supportApi.sendMessage(conversationId, sanitized, "agent", user.id);
        fetchMessages();
      } catch {
        // ignore
      }
    },
    [user, conversationId, fetchMessages],
  );

  return { messages, loading, sendMessage };
};
