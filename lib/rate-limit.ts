import { headers } from "next/headers";
import { dbConnect } from "@/lib/db/dbConnect";
import { RateLimitHit } from "@/models/RateLimitHit";

/** Best-effort caller IP from standard proxy headers (Vercel sets these), for use in server actions/route handlers. */
export async function clientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return headerList.get("x-real-ip") ?? "unknown";
}

/**
 * Fixed-window rate limiter backed by the app's own MongoDB — no
 * Redis/Upstash account needed. Each (key, window) pair is one document;
 * `expiresAt`'s TTL index reaps old windows automatically.
 */
export async function checkRateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<{ allowed: boolean; remaining: number }> {
  await dbConnect();

  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const compoundKey = `${key}:${windowStart}`;

  const doc = await RateLimitHit.findOneAndUpdate(
    { key: compoundKey },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowStart + windowMs + 60_000) } },
    { upsert: true, returnDocument: "after" },
  ).lean();

  const count = doc?.count ?? 1;
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}
