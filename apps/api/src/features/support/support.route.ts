import { randomUUID } from "node:crypto";
import { chatConversations, chatMessages, db } from "@growmate/db";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AuthVariables } from "../../infra/middleware/auth";
import { requireAuth } from "../../infra/middleware/auth";
import { requireRole } from "../../infra/middleware/role";
import { processAIChat } from "./ai-support.service";

export const supportRouter = new Hono<{ Variables: AuthVariables }>();

// All support endpoints require authentication
supportRouter.use("/*", requireAuth);

// Helper to format conversation
function formatConv(c: any, lastMsg?: any, unreadCount = 0) {
  return {
    id: c.id,
    user_id: c.userId,
    customer_name: c.customerName,
    customer_email: c.customerEmail,
    status: c.status,
    created_at: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
    updated_at: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
    last_message: lastMsg?.message || null,
    last_message_at: lastMsg?.createdAt ? new Date(lastMsg.createdAt).toISOString() : null,
    last_sender_role: lastMsg?.senderType || "customer",
    unread_count: unreadCount,
    profile: {
      full_name: c.customerName,
      email: c.customerEmail,
    },
  };
}

// Helper to format message
function formatMsg(m: any) {
  return {
    id: m.id,
    conversation_id: m.conversationId,
    sender_type: m.senderType,
    sender_id: m.senderId,
    message: m.message,
    is_read: !!m.isRead,
    created_at: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
  };
}

// GET /api/support/conversations (Staff view all; Customers view only their own)
supportRouter.get("/conversations", async (c) => {
  const authUser = c.get("user") as any;
  const isStaff = authUser.role === "admin" || authUser.role === "super_admin";

  let convos: any[];
  if (isStaff) {
    convos = await db.select().from(chatConversations).orderBy(desc(chatConversations.updatedAt));
  } else {
    convos = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.userId, authUser.id))
      .orderBy(desc(chatConversations.updatedAt));
  }

  const allMessages = await db.select().from(chatMessages);

  const formatted = convos.map((conv) => {
    const msgs = allMessages
      .filter((m) => m.conversationId === conv.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const lastMsg = msgs[0];
    const unreadCount = msgs.filter((m) => !m.isRead && m.senderType === "customer").length;
    return formatConv(conv, lastMsg, unreadCount);
  });

  return c.json({ success: true, data: formatted });
});

// POST /api/support/conversations (Authenticated customer or staff starts a conversation)
supportRouter.post("/conversations", async (c) => {
  const authUser = c.get("user") as any;
  const isStaff = authUser.role === "admin" || authUser.role === "super_admin";
  const body = await c.req.json();
  const id = body.id || randomUUID();

  const userId = isStaff ? body.userId || body.user_id || authUser.id : authUser.id;
  const customerName = isStaff
    ? body.customerName || body.customer_name || "Customer"
    : authUser.name || "Customer";
  const customerEmail = isStaff
    ? body.customerEmail || body.customer_email || authUser.email
    : authUser.email;

  const [created] = await db
    .insert(chatConversations)
    .values({
      id,
      userId,
      customerName,
      customerEmail: customerEmail || null,
      status: body.status || "open",
    })
    .returning();

  return c.json({ success: true, data: formatConv(created) }, 201);
});

// PATCH /api/support/conversations/:id
supportRouter.patch("/conversations/:id", async (c) => {
  const id = c.req.param("id");
  const authUser = c.get("user") as any;
  const isStaff = authUser.role === "admin" || authUser.role === "super_admin";
  const body = await c.req.json();

  if (!isStaff) {
    const [conv] = await db.select().from(chatConversations).where(eq(chatConversations.id, id));
    if (!conv || conv.userId !== authUser.id) {
      return c.json({ error: "Forbidden", message: "Access denied" }, 403);
    }
  }

  const updateData: any = { updatedAt: new Date() };
  if (body.status !== undefined) updateData.status = body.status;

  const [updated] = await db
    .update(chatConversations)
    .set(updateData)
    .where(eq(chatConversations.id, id))
    .returning();

  return c.json({ success: true, data: formatConv(updated) });
});

// DELETE /api/support/conversations/:id (Staff only)
supportRouter.delete("/conversations/:id", requireRole("admin"), async (c) => {
  const id = c.req.param("id");
  await db.delete(chatConversations).where(eq(chatConversations.id, id));
  return c.json({ success: true });
});

// GET /api/support/conversations/:id/messages
supportRouter.get("/conversations/:id/messages", async (c) => {
  const id = c.req.param("id");
  const authUser = c.get("user") as any;
  const isStaff = authUser.role === "admin" || authUser.role === "super_admin";

  if (!isStaff) {
    const [conv] = await db.select().from(chatConversations).where(eq(chatConversations.id, id));
    if (!conv || conv.userId !== authUser.id) {
      return c.json({ error: "Forbidden", message: "Access denied" }, 403);
    }
  }

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, id))
    .orderBy(chatMessages.createdAt);

  return c.json({ success: true, data: messages.map(formatMsg) });
});

// POST /api/support/conversations/:id/messages
supportRouter.post("/conversations/:id/messages", async (c) => {
  const conversationId = c.req.param("id");
  const authUser = c.get("user") as any;
  const isStaff = authUser.role === "admin" || authUser.role === "super_admin";
  const body = await c.req.json();

  if (!isStaff) {
    const [conv] = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.id, conversationId));
    if (!conv || conv.userId !== authUser.id) {
      return c.json({ error: "Forbidden", message: "Access denied" }, 403);
    }
  }

  const senderType = isStaff ? body.senderType || body.sender_type || "agent" : "customer";
  const senderId = isStaff ? body.senderId || body.sender_id || authUser.id : authUser.id;

  const [msg] = await db
    .insert(chatMessages)
    .values({
      id: randomUUID(),
      conversationId,
      senderType: senderType as any,
      senderId,
      message: body.message || "",
      isRead: body.isRead !== undefined ? !!body.isRead : false,
    })
    .returning();

  await db
    .update(chatConversations)
    .set({ updatedAt: new Date() })
    .where(eq(chatConversations.id, conversationId));

  return c.json({ success: true, data: formatMsg(msg) }, 201);
});

// POST /api/support/conversations/:id/read
supportRouter.post("/conversations/:id/read", async (c) => {
  const conversationId = c.req.param("id");
  await db
    .update(chatMessages)
    .set({ isRead: true })
    .where(and(eq(chatMessages.conversationId, conversationId), eq(chatMessages.isRead, false)));

  return c.json({ success: true });
});

// POST /api/support/ai-chat (GATED: Only authenticated users can chat with AI)
supportRouter.post("/ai-chat", async (c) => {
  const user = c.get("user") as any;
  const body = await c.req.json().catch(() => ({}));
  const userMessage = (body.message || "").trim();

  if (!userMessage) {
    return c.json({ success: false, error: "Message content cannot be empty" }, 400);
  }

  // Find or create active conversation for this customer
  let conversationId = body.conversationId || body.conversation_id;

  if (!conversationId) {
    const [existing] = await db
      .select()
      .from(chatConversations)
      .where(and(eq(chatConversations.userId, user.id), eq(chatConversations.status, "open")))
      .orderBy(desc(chatConversations.updatedAt))
      .limit(1);

    if (existing) {
      conversationId = existing.id;
    } else {
      conversationId = randomUUID();
      await db.insert(chatConversations).values({
        id: conversationId,
        userId: user.id,
        customerName: user.name || user.fullName || "Valued Customer",
        customerEmail: user.email || null,
        status: "open",
      });
    }
  }

  const result = await processAIChat({
    customer: {
      id: user.id,
      name: user.name || user.fullName || "Customer",
      email: user.email,
      phone: user.phone,
    },
    conversationId,
    userMessage,
  });

  return c.json({
    success: true,
    data: {
      conversationId,
      message: result.message,
      products: result.products,
    },
  });
});
