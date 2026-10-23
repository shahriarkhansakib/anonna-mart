import { randomUUID } from "node:crypto";
import {
  categories,
  chatConversations,
  chatMessages,
  db,
  deliveryZones,
  orders,
  products,
} from "@growmate/db";
import { and, desc, eq, ilike, lte, or } from "drizzle-orm";
import { logger } from "../../infra/lib/logger";

interface CustomerContext {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

// ---------------------------------------------------------------------------
// DETERMINISTIC BACKEND TOOLS (LIVE DATABASE)
// ---------------------------------------------------------------------------

export async function toolSearchProducts(args: {
  query?: string;
  category?: "Pet" | "Farm";
  maxPrice?: number;
  inStockOnly?: boolean;
}) {
  try {
    const conditions: any[] = [eq(products.isActive, true)];

    if (args.query && args.query.trim().length > 0) {
      const q = `%${args.query.trim()}%`;
      conditions.push(
        or(
          ilike(products.name, q),
          ilike(products.description, q),
          ilike(products.productType, q),
          ilike(products.brand, q),
        ),
      );
    }

    if (args.maxPrice && args.maxPrice > 0) {
      conditions.push(lte(products.price, args.maxPrice));
    }

    const items = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        originalPrice: products.originalPrice,
        discount: products.discount,
        stock: products.stockQuantity,
        badge: products.badge,
        productType: products.productType,
        images: products.images,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions))
      .limit(6);

    const filtered = args.inStockOnly !== false ? items.filter((p) => p.stock > 0) : items;

    return {
      success: true,
      count: filtered.length,
      products: filtered.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        original_price: p.originalPrice,
        discount_percent: p.discount,
        in_stock: p.stock > 0,
        stock_quantity: p.stock,
        badge: p.badge,
        category: p.categoryName || "Pet & Farm",
        image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
      })),
    };
  } catch (error: any) {
    logger.error({ module: "ai-tool", tool: "search_products", error: error?.message });
    return { success: false, error: "Unable to search catalog." };
  }
}

export async function toolGetOrderStatus(customerId: string, args: { orderNumber?: string }) {
  try {
    if (args.orderNumber && args.orderNumber.trim().length > 0) {
      const [order] = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.userId, customerId),
            ilike(orders.orderNumber, `%${args.orderNumber.trim()}%`),
          ),
        )
        .limit(1);

      if (!order) {
        return {
          found: false,
          message: `No order found with number "${args.orderNumber}" under your account.`,
        };
      }

      return {
        found: true,
        order: {
          order_number: order.orderNumber,
          status: order.status,
          payment_status: order.paymentStatus,
          total_amount: order.totalAmount,
          shipping_fee: order.shippingFee,
          created_at: order.createdAt,
          address: order.shippingAddress,
          tracking_code: order.trackingCode || "In Preparation",
        },
      };
    }

    // Return the customer's 3 most recent orders
    const recentOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, customerId))
      .orderBy(desc(orders.createdAt))
      .limit(3);

    return {
      found: recentOrders.length > 0,
      count: recentOrders.length,
      orders: recentOrders.map((o) => ({
        order_number: o.orderNumber,
        status: o.status,
        payment_status: o.paymentStatus,
        total_amount: o.totalAmount,
        created_at: o.createdAt,
        tracking_code: o.trackingCode || "In Preparation",
      })),
    };
  } catch (error: any) {
    logger.error({ module: "ai-tool", tool: "get_order_status", error: error?.message });
    return { success: false, error: "Unable to retrieve order history." };
  }
}

export async function toolGetDeliveryRates() {
  try {
    const zones = await db
      .select({
        id: deliveryZones.id,
        name: deliveryZones.name,
        district: deliveryZones.district,
        fee: deliveryZones.standardFee,
        estimatedHours: deliveryZones.estimatedDeliveryHours,
        estimatedDays: deliveryZones.estimatedDays,
        divisions: deliveryZones.divisions,
      })
      .from(deliveryZones)
      .where(eq(deliveryZones.isActive, true));

    return {
      success: true,
      zones: zones.map((z) => ({
        zone_name: z.name,
        district: z.district,
        delivery_fee: `৳${z.fee}`,
        estimated_time: z.estimatedDays || `${z.estimatedHours} hours`,
        divisions: z.divisions,
      })),
    };
  } catch (error: any) {
    logger.error({ module: "ai-tool", tool: "get_delivery_rates", error: error?.message });
    return {
      success: true,
      zones: [
        { zone_name: "Inside Dhaka", delivery_fee: "৳60", estimated_time: "24-48 Hours" },
        { zone_name: "Outside Dhaka", delivery_fee: "৳120", estimated_time: "2-4 Business Days" },
      ],
    };
  }
}

export function toolGetStorePolicies(args: { topic?: string }) {
  const topic = (args.topic || "all").toLowerCase();

  const policies = {
    returns:
      "GrowMate offers a 7-day hassle-free return/replacement policy on sealed, unopened, or damaged pet & farm goods upon delivery. Contact support with your order number to initiate a return.",
    shipping:
      "Delivery takes 24 to 48 hours within Dhaka (৳60) and 2 to 4 business days outside Dhaka (৳120). We partner with Steadfast Courier for fast delivery and live SMS tracking.",
    payment:
      "We accept Cash on Delivery (COD) across all 64 districts in Bangladesh, as well as bKash, Nagad, and credit/debit cards.",
    support:
      "Customer support is active from 9:00 AM to 10:00 PM every day. For urgent issues, you can request to speak directly with an agent in this chat.",
  };

  if (topic.includes("return") || topic.includes("refund")) return { policy: policies.returns };
  if (topic.includes("ship") || topic.includes("deliver")) return { policy: policies.shipping };
  if (topic.includes("pay") || topic.includes("cod") || topic.includes("bkash"))
    return { policy: policies.payment };

  return { policies };
}

export async function toolEscalateToHuman(conversationId: string, reason: string) {
  try {
    await db
      .update(chatConversations)
      .set({ status: "open", updatedAt: new Date() })
      .where(eq(chatConversations.id, conversationId));

    return {
      success: true,
      message:
        "The conversation has been marked for human agent attention in the GrowMate Admin Support portal.",
    };
  } catch (error: any) {
    logger.error({ module: "ai-tool", tool: "escalate_to_human", error: error?.message });
    return { success: false, error: "Failed to mark for human agent." };
  }
}

// ---------------------------------------------------------------------------
// OPENAI-COMPATIBLE TOOL DEFINITIONS FOR TOKEN HARBOR
// ---------------------------------------------------------------------------

const AI_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_products",
      description:
        "Search products in the live GrowMate store catalog by keyword, animal type, category, or maximum price. Always use this to check stock and prices.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Keyword such as 'cat food', 'bird seed', 'ocean fish', 'vitamin'",
          },
          category: {
            type: "string",
            enum: ["Pet", "Farm"],
            description: "Category of product",
          },
          maxPrice: {
            type: "number",
            description: "Maximum price filter in Bangladeshi Taka (৳)",
          },
          inStockOnly: {
            type: "boolean",
            description: "Whether to return only products currently in stock",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_status",
      description:
        "Retrieve tracking and status for the customer's orders. If orderNumber is omitted, returns their recent orders.",
      parameters: {
        type: "object",
        properties: {
          orderNumber: {
            type: "string",
            description: "Optional specific order number (e.g., ORD-12345)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_delivery_rates",
      description: "Get active delivery zones, shipping fees, and estimated delivery timelines.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_store_policies",
      description: "Get verified store policies on returns, refunds, delivery, or payment methods.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            enum: ["returns", "shipping", "payment", "support", "all"],
            description: "Topic of policy inquiry",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "escalate_to_human_agent",
      description:
        "Escalate the chat to a human customer support agent when the user specifically requests a human or has a complex dispute.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Reason for escalating to human support",
          },
        },
        required: ["reason"],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// AI CHAT PROCESSOR
// ---------------------------------------------------------------------------

export async function processAIChat(params: {
  customer: CustomerContext;
  conversationId: string;
  userMessage: string;
}) {
  const { customer, conversationId, userMessage } = params;

  // 1. Persist the customer message to chat_messages
  const customerMsgId = randomUUID();
  await db.insert(chatMessages).values({
    id: customerMsgId,
    conversationId,
    senderType: "customer",
    senderId: customer.id,
    message: userMessage,
    isRead: true,
  });

  // 2. Fetch recent conversation history (last 8 messages)
  const history = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, conversationId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(8);

  const formattedHistory = history.reverse().map((m) => ({
    role: m.senderType === "customer" ? ("user" as const) : ("assistant" as const),
    content: m.message,
  }));

  const systemPrompt = `You are GrowMate AI, the warm, knowledgeable, and reliable virtual shopping assistant for GrowMate (Anonna Mart) — Bangladesh's premier online store for Pet & Farm supplies.
Customer details:
- Name: ${customer.name}
- Email: ${customer.email || "Not specified"}
- User ID: ${customer.id}

Guidelines:
1. Greet the customer warmly and naturally. If they write in Bengali, reply fluently in Bengali. If they write in English, reply in English.
2. ALWAYS use the provided tools to check product inventory, prices, order status, or delivery fees. NEVER invent product prices or availability.
3. When recommending products, quote prices in Bangladeshi Taka (৳) and mention if they are in stock.
4. If the user asks about an order, call 'get_order_status'.
5. If the user asks about delivery costs, call 'get_delivery_rates'.
6. If the user expresses frustration or asks to speak to a person, call 'escalate_to_human_agent' and let them know a human representative will follow up in this thread.
7. Keep responses concise, helpful, and beautifully formatted in markdown.`;

  const apiKey = process.env.TOKENHARBOR_API_KEY || "";
  const baseUrl = process.env.TOKENHARBOR_BASE_URL || "https://tokenharbor.ai/v1";
  const model = process.env.TOKENHARBOR_MODEL || "mimo-v2.6-flash:free";

  let assistantReply = "";
  let extractedProducts: any[] = [];

  // If TOKENHARBOR_API_KEY is configured, call the Token Harbor gateway
  if (apiKey && apiKey.trim().length > 0) {
    try {
      const messagesPayload: any[] = [
        { role: "system", content: systemPrompt },
        ...formattedHistory,
      ];

      // First call to Token Harbor (with tools enabled)
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: messagesPayload,
          tools: AI_TOOLS,
          tool_choice: "auto",
          temperature: 0.4,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        logger.warn({ module: "ai-chat", status: res.status, error: errText });
        throw new Error(`Token Harbor request failed with status ${res.status}`);
      }

      const data = (await res.json()) as any;
      const choice = data.choices?.[0];
      const message = choice?.message;

      // Handle Tool Calls if any
      if (message?.tool_calls && message.tool_calls.length > 0) {
        messagesPayload.push(message);

        for (const toolCall of message.tool_calls) {
          const fnName = toolCall.function.name;
          let fnArgs: any = {};
          try {
            fnArgs = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            fnArgs = {};
          }

          let toolOutput: any = {};
          if (fnName === "search_products") {
            toolOutput = await toolSearchProducts(fnArgs);
            if (toolOutput.products) {
              extractedProducts = toolOutput.products;
            }
          } else if (fnName === "get_order_status") {
            toolOutput = await toolGetOrderStatus(customer.id, fnArgs);
          } else if (fnName === "get_delivery_rates") {
            toolOutput = await toolGetDeliveryRates();
          } else if (fnName === "get_store_policies") {
            toolOutput = toolGetStorePolicies(fnArgs);
          } else if (fnName === "escalate_to_human_agent") {
            toolOutput = await toolEscalateToHuman(
              conversationId,
              fnArgs.reason || "Customer request",
            );
          }

          messagesPayload.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolOutput),
          });
        }

        // Second call to generate natural language response using tool outputs
        const followUpRes = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: messagesPayload,
            temperature: 0.4,
          }),
        });

        if (followUpRes.ok) {
          const followUpData = (await followUpRes.json()) as any;
          assistantReply =
            followUpData.choices?.[0]?.message?.content || "I've checked our live catalog for you.";
        }
      } else {
        assistantReply =
          message?.content ||
          "Hello! How can I assist you with GrowMate's pet and farm supplies today?";
      }
    } catch (err: any) {
      logger.error({ module: "ai-chat", error: err?.message });
      // Fallback to local deterministic handler if Token Harbor call fails
      assistantReply = await runLocalDeterministicFallback(customer, conversationId, userMessage);
    }
  } else {
    // Graceful fallback when TOKENHARBOR_API_KEY is not yet populated
    assistantReply = await runLocalDeterministicFallback(customer, conversationId, userMessage);
  }

  // 3. Persist the AI assistant message to chat_messages
  const assistantMsgId = randomUUID();
  const [savedMsg] = await db
    .insert(chatMessages)
    .values({
      id: assistantMsgId,
      conversationId,
      senderType: "agent",
      senderId: "growmate-ai",
      message: assistantReply,
      isRead: false,
    })
    .returning();

  // 4. Touch conversation updated_at
  await db
    .update(chatConversations)
    .set({ updatedAt: new Date() })
    .where(eq(chatConversations.id, conversationId));

  return {
    success: true,
    message: {
      id: savedMsg.id,
      conversation_id: savedMsg.conversationId,
      sender_type: "agent",
      sender_id: "growmate-ai",
      message: savedMsg.message,
      created_at: savedMsg.createdAt.toISOString(),
    },
    products: extractedProducts,
  };
}

// ---------------------------------------------------------------------------
// HIGH-RELIABILITY DETERMINISTIC FALLBACK HANDLER
// ---------------------------------------------------------------------------

async function runLocalDeterministicFallback(
  customer: CustomerContext,
  conversationId: string,
  userMessage: string,
): Promise<string> {
  const lower = userMessage.toLowerCase();

  // 1. Order tracking query
  if (lower.includes("order") || lower.includes("track") || lower.includes("status")) {
    const orderData = await toolGetOrderStatus(customer.id, {});
    if (orderData.found && orderData.orders && orderData.orders.length > 0) {
      const list = orderData.orders
        .map(
          (o: any) =>
            `• **Order #${o.order_number}**: Status is **${o.status.toUpperCase()}** (Total: ৳${o.total_amount}). Courier Tracking: \`${o.tracking_code}\``,
        )
        .join("\n");
      return `Hello ${customer.name}! Here are your recent GrowMate orders:\n\n${list}\n\nNeed more details on a specific order? Just let me know!`;
    }
    return `Hello ${customer.name}! You don't have any recent orders on your account yet. Browse our pet and farm catalog to place your first order!`;
  }

  // 2. Delivery / Shipping inquiry
  if (
    lower.includes("delivery") ||
    lower.includes("shipping") ||
    lower.includes("charge") ||
    lower.includes("fee")
  ) {
    const rates = await toolGetDeliveryRates();
    const zoneList = (rates.zones || [])
      .map((z: any) => `• **${z.zone_name}**: ${z.delivery_fee} (${z.estimated_time})`)
      .join("\n");
    return `Here are GrowMate's standard delivery rates:\n\n${zoneList}\n\nWe provide fast doorstep delivery and live SMS tracking through Steadfast Courier across all 64 districts!`;
  }

  // 3. Return / Refund policy
  if (lower.includes("return") || lower.includes("refund") || lower.includes("exchange")) {
    const policy = toolGetStorePolicies({ topic: "returns" });
    return `**GrowMate Return Policy**:\n${policy.policy}\n\nIf you received an item that requires exchange or refund, let me know and I will immediately alert our support team!`;
  }

  // 4. Human agent request
  if (
    lower.includes("human") ||
    lower.includes("agent") ||
    lower.includes("person") ||
    lower.includes("talk to someone")
  ) {
    await toolEscalateToHuman(conversationId, "Customer requested human agent");
    return `I have notified our GrowMate customer support team! A human representative will review your message and reply right here in this chat shortly.`;
  }

  // 5. Product catalog search
  const searchResults = await toolSearchProducts({ query: userMessage, inStockOnly: true });
  if (searchResults.products && searchResults.products.length > 0) {
    const productList = searchResults.products
      .map(
        (p: any) =>
          `• **${p.name}** — **৳${p.price}** ${p.badge ? `[${p.badge}]` : ""} (${p.stock_quantity > 0 ? "In Stock" : "Out of Stock"})`,
      )
      .join("\n");
    return `Hello ${customer.name}! Here are items matching your query in our catalog:\n\n${productList}\n\nWould you like more details or help adding one to your cart?`;
  }

  // 6. Generic friendly greeting
  return `Hello ${customer.name}! 👋 Welcome to GrowMate AI Concierge. I can help you:
• **Find Pet & Farm Products** (e.g. *"Show me cat food"*, *"Do you have bird seeds?"*)
• **Track Your Orders** (e.g. *"What is the status of my order?"*)
• **Check Delivery Fees & Times** (e.g. *"How much is delivery inside Dhaka?"*)
• **Store Policies & Returns**

How can I help you today?`;
}
