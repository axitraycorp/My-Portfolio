import { z } from "zod";
import { TokenBucketLimiter, clientIp } from "@/lib/assistant/rate-limit";
import { fail, json, publicUser, requireUser } from "@/lab/server/http";
import { MIN_PASSWORD_LENGTH, hashPassword, verifyPassword } from "@/lab/server/password";
import { startSession } from "@/lab/server/session";
import { findUserForLogin, setPassword } from "@/lab/server/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = new TokenBucketLimiter(5, 1 / 20);

const schema = z.object({
   current: z.string().min(1).max(200),
   next: z.string().min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`).max(200),
});

export async function POST(req: Request) {
   const guard = await requireUser(req, { mutating: true });
   if (guard.error) return guard.error;

   const { allowed } = limiter.take(clientIp(req.headers));
   if (!allowed) return fail(429, "rate_limited", "Too many attempts. Wait a minute.");

   const parsed = schema.safeParse(await req.json().catch(() => null));
   if (!parsed.success) return fail(400, "invalid_request", parsed.error.issues[0]?.message);
   if (parsed.data.current === parsed.data.next) return fail(400, "invalid_request", "Choose a new password");

   const full = await findUserForLogin(guard.user.email);
   if (!full || !(await verifyPassword(parsed.data.current, full.passwordHash))) {
      return fail(401, "invalid_credentials", "Current password is incorrect");
   }

   // Bumps the session version: every other device is signed out, this one gets a fresh cookie
   const updated = await setPassword(guard.user.id, await hashPassword(parsed.data.next), false);
   if (!updated) return fail(404, "not_found");
   await startSession(updated);
   return json({ user: publicUser(updated) });
}
