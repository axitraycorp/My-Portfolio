/**
 * In-memory token bucket per key (client IP).
 *
 * Good enough for one server instance. On Vercel each serverless instance has
 * its own memory, so the limit is per instance and resets on cold starts. To
 * enforce a global limit, swap this for Upstash Redis (`@upstash/ratelimit`
 * with `Ratelimit.tokenBucket(...)`) keeping the same `take(key)` interface.
 */
export class TokenBucketLimiter {
   private buckets = new Map<string, { tokens: number; updated: number }>();

   constructor(
      /** Maximum burst size. */
      private readonly capacity: number,
      /** Tokens restored per second. */
      private readonly refillPerSecond: number,
      private readonly maxKeys = 10_000,
      private readonly now: () => number = Date.now
   ) {}

   /** Consumes one token. Returns whether the request is allowed and, if not, seconds until it would be. */
   take(key: string): { allowed: boolean; retryAfter: number } {
      const now = this.now();
      const bucket = this.buckets.get(key) ?? { tokens: this.capacity, updated: now };
      const elapsed = Math.max(0, (now - bucket.updated) / 1000);
      bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsed * this.refillPerSecond);
      bucket.updated = now;

      let allowed = false;
      if (bucket.tokens >= 1) {
         bucket.tokens -= 1;
         allowed = true;
      }

      // Re-insert so Map order tracks recency; evict the oldest key when full
      this.buckets.delete(key);
      this.buckets.set(key, bucket);
      if (this.buckets.size > this.maxKeys) {
         const oldest = this.buckets.keys().next().value;
         if (oldest !== undefined) this.buckets.delete(oldest);
      }

      const retryAfter = allowed ? 0 : Math.ceil((1 - bucket.tokens) / this.refillPerSecond);
      return { allowed, retryAfter };
   }
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
   const forwarded = headers.get("x-forwarded-for");
   if (forwarded) return forwarded.split(",")[0].trim();
   return headers.get("x-real-ip")?.trim() || "unknown";
}
