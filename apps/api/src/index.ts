import "./env";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { adminRouter } from "./features/admin/admin.route";
import { analyticsRouter } from "./features/analytics/analytics.route";
import { authRouter } from "./features/auth/auth.route";
import { cmsRouter } from "./features/cms/cms.route";
import { couponsRouter } from "./features/coupons/coupons.route";
import { courierRouter } from "./features/courier/courier.route";
import { deliveryZonesRouter } from "./features/delivery-zones/delivery-zones.route";
import { incompleteOrdersRouter } from "./features/incomplete-orders/incomplete-orders.route";
import { ordersRouter } from "./features/orders/orders.route";
import { permissionsRouter } from "./features/permissions/permissions.route";
import { productsRouter } from "./features/products/products.route";
import { returnsRouter } from "./features/returns/returns.route";
import { settingsRouter } from "./features/settings/settings.route";
import { supportRouter } from "./features/support/support.route";
import { usersRouter } from "./features/users/users.route";

import { logger } from "./infra/lib/logger";
import type { AuthVariables } from "./infra/middleware/auth";
import { rateLimit } from "./infra/middleware/rate-limit";

const app = new Hono<{ Variables: AuthVariables }>();

// Enable CORS
app.use(
  "*",
  cors({
    origin: (origin) => origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5003",
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "x-organization-id",
      "better-auth-agent",
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

// Structured logger
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  logger.info(
    { module: "http", method: c.req.method, path: c.req.path, status: c.res.status, ms },
    `${c.req.method} ${c.req.path} ${c.res.status} ${ms}ms`,
  );
});

// Rate limiting
app.use("*", rateLimit(300, 60));

// Feature Modules
app.route("/api/auth", authRouter);
app.route("/api/admin", adminRouter);
app.route("/api/permissions", permissionsRouter);
app.route("/api/products", productsRouter);

app.route("/api/orders", ordersRouter);
app.route("/api/delivery-zones", deliveryZonesRouter);
app.route("/api/coupons", couponsRouter);
app.route("/api/analytics", analyticsRouter);
app.route("/api/cms", cmsRouter);
app.route("/api/support", supportRouter);
app.route("/api/settings", settingsRouter);
app.route("/api/incomplete-orders", incompleteOrdersRouter);
app.route("/api/returns", returnsRouter);
app.route("/api/users", usersRouter);
app.route("/api/customers", usersRouter);

// Steadfast & Server Function Handlers (Drop-in for invokeFn)
app.route("/api/courier", courierRouter);
app.route("/api/public/fn", courierRouter);

// System health
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    service: "growmate-api",
    timestamp: new Date().toISOString(),
  });
});

// Fallback & 404
app.notFound((c) => {
  return c.json(
    { error: "Not Found", message: `${c.req.method} ${c.req.path} does not exist.` },
    404,
  );
});

app.onError((err, c) => {
  logger.error(
    { module: "http", err: err.message, path: c.req.path, method: c.req.method },
    "Unhandled exception",
  );
  return c.json(
    {
      error: "Internal Server Error",
      message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong.",
    },
    500,
  );
});

export default app;
