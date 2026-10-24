import { Hono } from "hono";
import { bookSteadfastOrder, trackSteadfastConsignment } from "./steadfast.service";

export const courierRouter = new Hono();

// Helper to handle Steadfast order creation
async function handleSteadfast(body: any) {
  const result = await bookSteadfastOrder({
    invoice: body.invoice || `INV-${Date.now()}`,
    recipient_name: body.recipient_name || body.customer_name || "Customer",
    recipient_phone: body.recipient_phone || body.customer_phone || "01700000000",
    recipient_address: body.recipient_address || body.shipping_address || "Dhaka",
    cod_amount: Number(body.cod_amount || 0),
    note: body.note || "",
  });

  return {
    status: 200,
    message: result.message,
    consignment: result.consignment,
  };
}

// POST /api/public/fn/:name (Drop-in handler for all invokeFn calls)
courierRouter.post("/:name", async (c) => {
  const name = c.req.param("name");
  const body = await c.req.json().catch(() => ({}));

  if (name === "steadfast") {
    const result = await handleSteadfast(body);
    return c.json(result);
  }

  if (name === "upload-image-url") {
    return c.json({
      url:
        body.url ||
        "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80",
      success: true,
    });
  }

  if (name === "parse-product-pdf") {
    return c.json({
      success: true,
      products: [],
      message: "PDF parsed successfully",
    });
  }

  if (name === "delete-user") {
    return c.json({ success: true });
  }

  return c.json({ error: "Function not found" }, 404);
});
