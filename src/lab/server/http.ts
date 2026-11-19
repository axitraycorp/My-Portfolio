import "server-only";
import { getSessionUser } from "./session";
import type { LabUser } from "./users";

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
   return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export const fail = (status: number, error: string, message?: string) => json({ error, message }, status);

/** Blocks cross-site form posts: mutating requests must come from this origin. */
export function sameOrigin(req: Request): boolean {
   const origin = req.headers.get("origin");
   if (!origin) return req.headers.get("sec-fetch-site") !== "cross-site";
   const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
   try {
      return new URL(origin).host === host;
   } catch {
      return false;
   }
}

type Guarded = { user: LabUser; error?: undefined } | { user?: undefined; error: Response };

export async function requireUser(req: Request, opts: { mutating?: boolean } = {}): Promise<Guarded> {
   if (opts.mutating && !sameOrigin(req)) return { error: fail(403, "forbidden", "Cross-site request blocked") };
   const user = await getSessionUser();
   if (!user) return { error: fail(401, "unauthorised", "Sign in to continue") };
   return { user };
}

export async function requireAdmin(req: Request, opts: { mutating?: boolean } = {}): Promise<Guarded> {
   const result = await requireUser(req, opts);
   if (result.error) return result;
   if (result.user.role !== "admin") return { error: fail(403, "forbidden", "Admins only") };
   return result;
}

/** What the browser may know about an account. */
export function publicUser(user: LabUser) {
   return {
      id: user.id,
      email: user.email,
      role: user.role,
      maxBuilds: user.maxBuilds,
      advisorCredits: user.advisorCredits,
      advisorUsed: user.advisorUsed,
      mustChangePassword: user.mustChangePassword,
   };
}
export type PublicUser = ReturnType<typeof publicUser>;
