import { Redis } from "@upstash/redis";
import type { KvResult } from "./types";

let cached: Redis | null = null;

function client(): Redis {
  if (cached) return cached;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Upstash Redis env vars missing: KV_REST_API_URL/KV_REST_API_TOKEN",
    );
  }
  cached = new Redis({ url, token });
  return cached;
}

export interface KvLike {
  get<T = unknown>(key: string): Promise<KvResult<T | null>>;
  setJson(
    key: string,
    value: unknown,
    opts?: { ttlSeconds?: number; nx?: boolean },
  ): Promise<KvResult<boolean>>;
  del(key: string): Promise<KvResult<number>>;
  incrWithTtl(key: string, ttlSeconds: number): Promise<KvResult<number>>;
}

export const kv: KvLike = {
  async get<T>(key: string): Promise<KvResult<T | null>> {
    try {
      const value = await client().get<T>(key);
      return { ok: true, value: (value ?? null) as T | null };
    } catch (error) {
      return { ok: false, error: errMessage(error) };
    }
  },

  async setJson(
    key: string,
    value: unknown,
    opts: { ttlSeconds?: number; nx?: boolean } = {},
  ): Promise<KvResult<boolean>> {
    try {
      const args: Record<string, unknown> = {};
      if (opts.ttlSeconds && opts.ttlSeconds > 0) args.ex = opts.ttlSeconds;
      if (opts.nx) args.nx = true;
      const result = await client().set(
        key,
        value,
        args as Parameters<Redis["set"]>[2],
      );
      return { ok: true, value: result === "OK" };
    } catch (error) {
      return { ok: false, error: errMessage(error) };
    }
  },

  async del(key: string): Promise<KvResult<number>> {
    try {
      const n = await client().del(key);
      return { ok: true, value: n };
    } catch (error) {
      return { ok: false, error: errMessage(error) };
    }
  },

  async incrWithTtl(
    key: string,
    ttlSeconds: number,
  ): Promise<KvResult<number>> {
    try {
      const c = client();
      const n = await c.incr(key);
      if (n === 1) {
        await c.expire(key, ttlSeconds);
      }
      return { ok: true, value: n };
    } catch (error) {
      return { ok: false, error: errMessage(error) };
    }
  },
};

function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
