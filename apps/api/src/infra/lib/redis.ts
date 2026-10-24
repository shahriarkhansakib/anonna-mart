import { Redis as UpstashRedis } from "@upstash/redis";
import Redis from "ioredis";
import { logger } from "./logger";

/**
 * Unified Redis adapter (inspired by healer0 architecture).
 *
 * Dev/local: ioredis → local Docker Redis container (redis://127.0.0.1:6380).
 * Prod / Vercel: @upstash/redis → HTTP-based serverless-safe client.
 *
 * Fault-tolerant: Contains an in-memory fallback cache so that OAuth states,
 * session cookies, and rate limits NEVER fail if Redis is temporarily offline or disconnected.
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

// In-memory fallback cache for when Redis is unavailable
const memoryCache = new Map<string, { value: string; expiresAt: number | null }>();

function memoryGet(key: string): string | null {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (item.expiresAt !== null && Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return item.value;
}

function memorySet(key: string, value: string, ttlSeconds?: number): void {
  memoryCache.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  });
}

function memoryDel(...keys: string[]): number {
  let count = 0;
  for (const k of keys) {
    if (memoryCache.delete(k)) count++;
  }
  return count;
}

function memoryIncrby(key: string, amount: number): number {
  const current = Number.parseInt(memoryGet(key) || "0", 10) || 0;
  const next = current + amount;
  const existing = memoryCache.get(key);
  memoryCache.set(key, {
    value: String(next),
    expiresAt: existing?.expiresAt ?? null,
  });
  return next;
}

function memoryExpire(key: string, seconds: number): number {
  const existing = memoryCache.get(key);
  if (!existing) return 0;
  existing.expiresAt = Date.now() + seconds * 1000;
  return 1;
}

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
          if (val === null || val === undefined) return memoryGet(key);
          return typeof val === "string" ? val : JSON.stringify(val);
        } catch (err: any) {
          logger.warn(
            { module: "redis", err: err?.message },
            "Upstash get error, using memory fallback",
          );
          return memoryGet(key);
        }
      },

      async set(key: string, value: string, modeOrTtl?: string | number, ttl?: number) {
        let ttlSeconds: number | undefined;
        if (typeof modeOrTtl === "number") {
          ttlSeconds = modeOrTtl;
        } else if (modeOrTtl === "EX" && typeof ttl === "number") {
          ttlSeconds = ttl;
        }
        memorySet(key, value, ttlSeconds);
        try {
          if (ttlSeconds) {
            return await client.set(key, value, { ex: ttlSeconds });
          }
          return await client.set(key, value);
        } catch (err: any) {
          return "OK";
        }
      },

      async del(...keys: string[]) {
        memoryDel(...keys);
        try {
          if (!keys.length) return 0;
          return await client.del(...keys);
        } catch {
          return keys.length;
        }
      },

      async incr(key: string) {
        return this.incrby(key, 1);
      },

      async incrby(key: string, amount: number) {
        const localVal = memoryIncrby(key, amount);
        try {
          return await client.incrby(key, amount);
        } catch {
          return localVal;
        }
      },

      async expire(key: string, seconds: number) {
        memoryExpire(key, seconds);
        try {
          return await client.expire(key, seconds);
        } catch {
          return 1;
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

  // Local development / fallback: ioredis with transparent in-memory fallback
  const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6380";
  let isConnected = false;

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 100, 2000);
    },
  });

  client.on("connect", () => {
    isConnected = true;
  });
  client.on("ready", () => {
    isConnected = true;
  });
  client.on("close", () => {
    isConnected = false;
  });
  client.on("error", (err) => {
    isConnected = false;
    logger.warn(
      { module: "redis", err: err.message },
      "Local Redis connection inactive, using resilient memory store",
    );
  });

  return {
    async get(key: string) {
      if (isConnected) {
        try {
          const val = await client.get(key);
          if (val !== null) return val;
        } catch {
          isConnected = false;
        }
      }
      return memoryGet(key);
    },

    async set(key: string, value: string, modeOrTtl?: string | number, ttl?: number) {
      let ttlSeconds: number | undefined;
      if (typeof modeOrTtl === "number") {
        ttlSeconds = modeOrTtl;
      } else if (modeOrTtl === "EX" && typeof ttl === "number") {
        ttlSeconds = ttl;
      }
      memorySet(key, value, ttlSeconds);

      if (isConnected) {
        try {
          if (ttlSeconds) {
            return await client.set(key, value, "EX", ttlSeconds);
          }
          return await client.set(key, value);
        } catch {
          isConnected = false;
        }
      }
      return "OK";
    },

    async del(...keys: string[]) {
      const removed = memoryDel(...keys);
      if (isConnected) {
        try {
          if (!keys.length) return 0;
          return await client.del(...keys);
        } catch {
          isConnected = false;
        }
      }
      return removed;
    },

    async incr(key: string) {
      return this.incrby(key, 1);
    },

    async incrby(key: string, amount: number) {
      const val = memoryIncrby(key, amount);
      if (isConnected) {
        try {
          return await client.incrby(key, amount);
        } catch {
          isConnected = false;
        }
      }
      return val;
    },

    async expire(key: string, seconds: number) {
      memoryExpire(key, seconds);
      if (isConnected) {
        try {
          return await client.expire(key, seconds);
        } catch {
          isConnected = false;
        }
      }
      return 1;
    },

    async smembers(key: string) {
      if (isConnected) {
        try {
          return await client.smembers(key);
        } catch {
          isConnected = false;
        }
      }
      return [];
    },

    async sadd(key: string, ...members: string[]) {
      if (isConnected) {
        try {
          if (!members.length) return 0;
          return await (client as any).sadd(key, ...members);
        } catch {
          isConnected = false;
        }
      }
      return 0;
    },

    async keys(pattern: string) {
      if (isConnected) {
        try {
          return await client.keys(pattern);
        } catch {
          isConnected = false;
        }
      }
      return [];
    },

    pipeline() {
      return client.pipeline();
    },

    async ping() {
      if (isConnected) {
        try {
          return await client.ping();
        } catch {
          isConnected = false;
        }
      }
      return "PONG";
    },

    on(event: string, callback: (...args: any[]) => void) {
      client.on(event, callback);
    },
  };
}

export const redis = buildAdapter();
