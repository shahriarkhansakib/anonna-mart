import Redis from "ioredis";
import { logger } from "./logger";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6380";

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 100, 2000);
  },
});

redis.on("error", (err) => {
  logger.warn({ module: "redis", err: err.message }, "Redis connection degraded or inactive");
});
