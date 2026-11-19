import { z } from "zod";
import { fail, json, requireAdmin } from "@/lab/server/http";
import { generatePassword, hashPassword } from "@/lab/server/password";
import { createUser, findUserForLogin, listUsers } from "@/lab/server/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
   email: z.string().trim().email("Enter a valid email").max(200),
   role: z.enum(["user", "admin"]).default("user"),
   maxBuilds: z.number().int().min(0).max(500).default(3),
   advisorCredits: z.number().int().min(0).max(1000).default(5),
});

export async function GET(req: Request) {
   const guard = await requireAdmin(req);
   if (guard.error) return guard.error;
   const users = await listUsers();
   return json({
      users: users.map((u) => ({
         id: u.id,
         email: u.email,
         role: u.role,
         disabled: u.disabled,
         maxBuilds: u.maxBuilds,
         advisorCredits: u.advisorCredits,
         advisorUsed: u.advisorUsed,
         mustChangePassword: u.mustChangePassword,
         buildCount: u.buildCount,
         createdAt: u.createdAt,
      })),
   });
}

/** The only way an account is ever created. The one-time password is returned once. */
export async function POST(req: Request) {
   const guard = await requireAdmin(req, { mutating: true });
   if (guard.error) return guard.error;

   const parsed = schema.safeParse(await req.json().catch(() => null));
   if (!parsed.success) return fail(400, "invalid_request", parsed.error.issues[0]?.message);
   if (await findUserForLogin(parsed.data.email)) return fail(409, "exists", "An account with this email already exists");

   const password = generatePassword();
   const user = await createUser({ ...parsed.data, passwordHash: await hashPassword(password) });
   return json({ user: { id: user.id, email: user.email }, oneTimePassword: password }, 201);
}
