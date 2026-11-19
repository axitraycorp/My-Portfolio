import { fail, json, requireUser } from "@/lab/server/http";
import { deleteBuild, getBuild, updateBuild } from "@/lab/server/builds";
import { parseBuild } from "@/lab/model/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(req: Request, { params }: Ctx) {
   const guard = await requireUser(req);
   if (guard.error) return guard.error;
   const { id } = await params;
   const saved = UUID.test(id) ? await getBuild(guard.user.id, id) : null;
   return saved ? json({ build: saved }) : fail(404, "not_found");
}

export async function PUT(req: Request, { params }: Ctx) {
   const guard = await requireUser(req, { mutating: true });
   if (guard.error) return guard.error;
   const { id } = await params;
   if (!UUID.test(id)) return fail(404, "not_found");

   const parsed = parseBuild(await req.json().catch(() => null));
   if (!parsed.ok) return fail(400, "invalid_request", parsed.error);

   const saved = await updateBuild(guard.user.id, id, parsed.data);
   return saved ? json({ build: saved }) : fail(404, "not_found");
}

export async function DELETE(req: Request, { params }: Ctx) {
   const guard = await requireUser(req, { mutating: true });
   if (guard.error) return guard.error;
   const { id } = await params;
   const ok = UUID.test(id) && (await deleteBuild(guard.user.id, id));
   return ok ? json({ ok: true }) : fail(404, "not_found");
}
