import { z } from "zod";
import { fail, json, requireAdmin } from "@/lab/server/http";
import { generatePassword, hashPassword } from "@/lab/server/password";
import { bumpSessionVersion, deleteUser, findUserById, setPassword, updateUserLimits } from "@/lab/server/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
   maxBuilds: z.number().int().min(0).max(500).optional(),
   advisorCredits: z.number().int().min(0).max(1000).optional(),
   disabled: z.boolean().optional(),
   resetPassword: z.literal(true).optional(),
   signOutEverywhere: z.literal(true).optional(),
});

export async function PATCH(req: Request, { params }: Ctx) {
   const guard = await requireAdmin(req, { mutating: true });
   if (guard.error) return guard.error;
   const { id } = await params;

   const parsed = schema.safeParse(await req.json().catch(() => null));
   if (!parsed.success) return fail(400, "invalid_request", parsed.error.issues[0]?.message);
   const patch = parsed.data;
   if (id === guard.user.id && patch.disabled) return fail(400, "invalid_request", "You can't disable your own account");
   if (!(await findUserById(id))) return fail(404, "not_found");

   await updateUserLimits(id, patch);
   if (patch.signOutEverywhere) await bumpSessionVersion(id);

   let oneTimePassword: string | undefined;
   if (patch.resetPassword) {
      oneTimePassword = generatePassword();
      await setPassword(id, await hashPassword(oneTimePassword), true);
   }
   return json({ ok: true, oneTimePassword });
}

export async function DELETE(req: Request, { params }: Ctx) {
   const guard = await requireAdmin(req, { mutating: true });
   if (guard.error) return guard.error;
   const { id } = await params;
   if (id === guard.user.id) return fail(400, "invalid_request", "You can't delete your own account");
   await deleteUser(id);
   return json({ ok: true });
}
