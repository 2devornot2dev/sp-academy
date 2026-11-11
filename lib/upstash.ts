// lib/upstash.ts

import { Redis } from "@upstash/redis";
import crypto from "crypto";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export type UserGenerationData = {
  firstName?: string;
  nativeLanguage?: string;
  targetLanguage?: string;
  level?: string;
  goals?: string[];
  [key: string]: any;
};

/**
 * Generates a short random token, stores the user's onboarding data in Upstash
 * for 10 minutes (600s), and returns the token for the URL (?setup=token).
 */
export async function setUserGeneration(
  data: UserGenerationData,
): Promise<string> {
  const token = crypto.randomBytes(6).toString("hex");
  const key = `user_gen:${token}`;

  await redis.set(key, data, { ex: 600 });

  return token;
}

/**
 * Reads the onboarding generation data from Upstash using the token from searchParams.
 */
export async function getUserGeneration(
  token?: string | null,
): Promise<UserGenerationData | null> {
  if (!token) return null;

  const key = `user_gen:${token}`;
  const data = await redis.get<UserGenerationData>(key);

  return data ?? null;
}

/**
 * Optional helper if you want to manually delete it once generation finishes
 */
export async function deleteUserGeneration(token: string): Promise<void> {
  await redis.del(`user_gen:${token}`);
}

// ============================================================================
// FREESTYLE CONVERSATION COOLDOWN (5 MIN) & DAILY CAP (5/DAY) VIA REDIS TTL
// ============================================================================
const FREESTYLE_COOLDOWN_SECONDS = 300; // 5 minutes
const FREESTYLE_DAILY_MAX = 5;

function getDailyKey(userId: string) {
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  return `freestyle:daily:${userId}:${day}`;
}

function getCooldownKey(userId: string) {
  return `freestyle:cooldown:${userId}`;
}

/**
 * Called when a user completes a VALID 3-minute Freestyle conversation.
 * Sets a 300s (5-min) auto-expiring cooldown key and increments their daily counter.
 */
export async function recordValidFreestyleInRedis(
  userId: string,
  sessionId: string,
): Promise<{ dailyUsed: number; cooldownSeconds: number }> {
  const cooldownKey = getCooldownKey(userId);
  const dailyKey = getDailyKey(userId);

  const pipe = redis.pipeline();
  pipe.set(cooldownKey, sessionId, { ex: FREESTYLE_COOLDOWN_SECONDS });
  pipe.incr(dailyKey);
  pipe.expire(dailyKey, 86400); // Auto-expire daily key after 24h
  const results = await pipe.exec();

  const dailyUsed = Number(results?.[1] ?? 1);
  return {
    dailyUsed,
    cooldownSeconds: FREESTYLE_COOLDOWN_SECONDS,
  };
}

/**
 * Reads the user's active 5-min cooldown TTL and daily usage in a single Redis round-trip.
 */
export async function getFreestyleRedisState(userId: string): Promise<{
  cooldownSessionId: string | null;
  cooldownSecondsLeft: number;
  dailyUsed: number;
  dailyMax: number;
  hitDailyCap: boolean;
}> {
  const cooldownKey = getCooldownKey(userId);
  const dailyKey = getDailyKey(userId);

  const pipe = redis.pipeline();
  pipe.get<string>(cooldownKey);
  pipe.ttl(cooldownKey);
  pipe.get<number>(dailyKey);

  const [sessionId, ttl, dailyCount] = await pipe.exec<[
    string | null,
    number,
    number | null,
  ]>();

  const cooldownSecondsLeft = typeof ttl === "number" && ttl > 0 ? ttl : 0;
  const dailyUsed = Number(dailyCount ?? 0);

  return {
    cooldownSessionId: cooldownSecondsLeft > 0 ? sessionId : null,
    cooldownSecondsLeft,
    dailyUsed,
    dailyMax: FREESTYLE_DAILY_MAX,
    hitDailyCap: dailyUsed >= FREESTYLE_DAILY_MAX,
  };
}