import { Redis as UpstashRedis } from "@upstash/redis";
import Redis from "ioredis";
import { logger } from "./logger";

/**
 * Unified Redis adapter (inspired by healer0 architecture).
 *
 * Dev/local: ioredis → local Docker Redis container (redis://127.0.0.1:6380).
 * Prod / Vercel: @upstash/redis → HTTP-based serverless-safe client.
 *
 * Uses UPSTASH_URL / UPSTASH_REDIS_REST_URL and UPSTASH_TOKEN / UPSTASH_REDIS_REST_TOKEN.
 */

export type RedisAdapter = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, modeOrTtl?: string | number, ttl?: number): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
  incr(key: string): Promise<number>;
  incrby(key: string, amount: number): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
  smembers(key: string): Promise<string[]>;
  sadd(key: string, ...members: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  pipeline(): any;
  ping(): Promise<string | unknown>;
  on?(event: string, callback: (...args: any[]) => void): void;
};

function buildAdapter(): RedisAdapter {
  const upstashUrl = process.env.UPSTASH_URL || process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    logger.info({ module: "redis" }, "Initializing Upstash HTTP serverless Redis client");
    const client = new UpstashRedis({ url: upstashUrl, token: upstashToken });

    return {
      async get(key: string) {
        try {
          const val = await client.get<string | number | object>(key);
          if (val === null || val === undefined) return null;
          return typeof val === "string" ? val : JSON.stringify(val);
        } catch (err: any) {
          logger.warn({ module: "redis", err: err?.message }, "Upstash get error");
          return null;
        }
      },

      async set(key: string, value: string, modeOrTtl?: string | number, ttl?: number) {
        try {
          let ttlSeconds: number | undefined;
          if (typeof modeOrTtl === "number") {
            ttlSeconds = modeOrTtl;
          } else if (modeOrTtl === "EX" && typeof ttl === "number") {
            ttlSeconds = ttl;
          }
          if (ttlSeconds) {
            return await client.set(key, value, { ex: ttlSeconds });
          }
          return await client.set(key, value);
        } catch (err: any) {
          logger.warn({ module: "redis", err: err?.message }, "Upstash set error");
          return null;
        }
      },

      async del(...keys: string[]) {
        try {
          if (!keys.length) return 0;
          return await client.del(...keys);
        } catch (err: any) {
          logger.warn({ module: "redis", err: err?.message }, "Upstash del error");
          return 0;
        }
      },

      async incr(key: string) {
        try {
          return await client.incr(key);
        } catch {
          return 1;
        }
      },

      async incrby(key: string, amount: number) {
        try {
          return await client.incrby(key, amount);
        } catch {
          return amount;
        }
      },

      async expire(key: string, seconds: number) {
        try {
          return await client.expire(key, seconds);
        } catch {
          return 0;
        }
      },

      async smembers(key: string) {
        try {
          const members = await client.smembers(key);
          return members || [];
        } catch {
          return [];
        }
      },

      async sadd(key: string, ...members: string[]) {
        try {
          if (!members.length) return 0;
          return await (client as any).sadd(key, ...members);
        } catch {
          return 0;
        }
      },

      async keys(pattern: string) {
        try {
          return await client.keys(pattern);
        } catch {
          return [];
        }
      },

      pipeline() {
        return client.pipeline();
      },

      async ping() {
        try {
          return await client.ping();
        } catch {
          return "PONG";
        }
      },

      on() {
        // No-op for HTTP-based Upstash client
      },
    };
  }

  // Local development / fallback: ioredis
  const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6380";
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 100, 2000);
    },
  });

  client.on("error", (err) => {
    logger.warn({ module: "redis", err: err.message }, "Redis connection degraded or inactive");
  });

  return {
    async get(key: string) {
      try {
        return await client.get(key);
      } catch {
        return null;
      }
    },

    async set(key: string, value: string, modeOrTtl?: string | number, ttl?: number) {
      try {
        if (typeof modeOrTtl === "number") {
          return await client.set(key, value, "EX", modeOrTtl);
        }
        if (modeOrTtl === "EX" && typeof ttl === "number") {
          return await client.set(key, value, "EX", ttl);
        }
        return await client.set(key, value);
      } catch {
        return null;
      }
    },

    async del(...keys: string[]) {
      try {
        if (!keys.length) return 0;
        return await client.del(...keys);
      } catch {
        return 0;
      }
    },

    async incr(key: string) {
      try {
        return await client.incr(key);
      } catch {
        return 1;
      }
    },

    async incrby(key: string, amount: number) {
      try {
        return await client.incrby(key, amount);
      } catch {
        return amount;
      }
    },

    async expire(key: string, seconds: number) {
      try {
        return await client.expire(key, seconds);
      } catch {
        return 0;
      }
    },

    async smembers(key: string) {
      try {
        return await client.smembers(key);
      } catch {
        return [];
      }
    },

    async sadd(key: string, ...members: string[]) {
      try {
        if (!members.length) return 0;
        return await (client as any).sadd(key, ...members);
      } catch {
        return 0;
      }
    },

    async keys(pattern: string) {
      try {
        return await client.keys(pattern);
      } catch {
        return [];
      }
    },

    pipeline() {
      return client.pipeline();
    },

    async ping() {
      try {
        return await client.ping();
      } catch {
        return "PONG";
      }
    },

    on(event: string, callback: (...args: any[]) => void) {
      client.on(event, callback);
    },
  };
}

export const redis = buildAdapter();
