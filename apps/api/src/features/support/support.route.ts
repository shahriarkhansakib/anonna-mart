import { randomUUID } from "node:crypto";
import { chatConversations, chatMessages, db } from "@growmate/db";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AuthVariables } from "../../infra/middleware/auth";
import { requireAuth } from "../../infra/middleware/auth";
import { processAIChat } from "./ai-support.service";

export const supportRouter = new Hono<{ Variables: AuthVariables }>();

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

// GET /api/support/conversations
supportRouter.get("/conversations", async (c) => {
  const convos = await db
    .select()
    .from(chatConversations)
    .orderBy(desc(chatConversations.updatedAt));

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

// POST /api/support/conversations
supportRouter.post("/conversations", async (c) => {
  const body = await c.req.json();
  const id = body.id || randomUUID();

  const [created] = await db
    .insert(chatConversations)
    .values({
      id,
      userId: body.userId || body.user_id || null,
      customerName: body.customerName || body.customer_name || "Guest Customer",
      customerEmail: body.customerEmail || body.customer_email || null,
      status: body.status || "open",
    })
    .returning();

  return c.json({ success: true, data: formatConv(created) }, 201);
});

// PATCH /api/support/conversations/:id
supportRouter.patch("/conversations/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const updateData: any = { updatedAt: new Date() };
  if (body.status !== undefined) updateData.status = body.status;

  const [updated] = await db
    .update(chatConversations)
    .set(updateData)
    .where(eq(chatConversations.id, id))
    .returning();

  return c.json({ success: true, data: formatConv(updated) });
});

// DELETE /api/support/conversations/:id
supportRouter.delete("/conversations/:id", async (c) => {
  const id = c.req.param("id");
  await db.delete(chatConversations).where(eq(chatConversations.id, id));
  return c.json({ success: true });
});

// GET /api/support/conversations/:id/messages
supportRouter.get("/conversations/:id/messages", async (c) => {
  const id = c.req.param("id");
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
  const body = await c.req.json();

  const [msg] = await db
    .insert(chatMessages)
    .values({
      id: randomUUID(),
      conversationId,
      senderType: (body.senderType || body.sender_type || "agent") as any,
      senderId: body.senderId || body.sender_id || null,
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
supportRouter.post("/ai-chat", requireAuth, async (c) => {
  const user = c.get("user");
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
