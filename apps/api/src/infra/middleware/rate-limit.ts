import type { MiddlewareHandler } from "hono";

export function rateLimit(limit = 200, windowSecs = 60): MiddlewareHandler {
  const requests = new Map<string, { count: number; resetAt: number }>();

  return async (c, next) => {
    const ip = c.req.header("x-forwarded-for") || "local";
    const now = Date.now();
    const entry = requests.get(ip);

    if (!entry || now > entry.resetAt) {
      requests.set(ip, { count: 1, resetAt: now + windowSecs * 1000 });
      return next();
    }

    if (entry.count >= limit) {
      return c.json({ error: "Too Many Requests", message: "Rate limit exceeded" }, 429);
    }

    entry.count += 1;
    await next();
  };
}
