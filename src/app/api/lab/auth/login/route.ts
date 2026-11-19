import { z } from "zod";
import { TokenBucketLimiter, clientIp } from "@/lib/assistant/rate-limit";
import { fail, json, publicUser, sameOrigin } from "@/lab/server/http";
import { verifyPassword } from "@/lab/server/password";
import { authConfigured, startSession } from "@/lab/server/session";
import { findUserForLogin } from "@/lab/server/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 5 attempts, then one every 20 s per IP
const limiter = new TokenBucketLimiter(5, 1 / 20);

const schema = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) });

// Spend the same time on unknown emails so they can't be told apart
const DUMMY_HASH =
   "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

export async function POST(req: Request) {
   if (!sameOrigin(req)) return fail(403, "forbidden");
   if (!authConfigured()) return fail(503, "unavailable", "Accounts are not configured on this deployment");

   const { allowed, retryAfter } = limiter.take(clientIp(req.headers));
   if (!allowed) return json({ error: "rate_limited", message: `Too many attempts. Try again in ${retryAfter} s.` }, 429, { "Retry-After": String(retryAfter) });

   const parsed = schema.safeParse(await req.json().catch(() => null));
   if (!parsed.success) return fail(400, "invalid_request", "Enter your email and password");

   const user = await findUserForLogin(parsed.data.email);
   const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
   if (!user || !ok) return fail(401, "invalid_credentials", "Email or password is incorrect");
   if (user.disabled) return fail(403, "disabled", "This account is disabled. Contact the site owner.");

   await startSession(user);
   return json({ user: publicUser(user) });
}
