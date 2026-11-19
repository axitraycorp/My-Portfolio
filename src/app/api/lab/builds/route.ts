import { fail, json, requireUser } from "@/lab/server/http";
import { createBuild, listBuilds } from "@/lab/server/builds";
import { parseBuild } from "@/lab/model/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
   const guard = await requireUser(req);
   if (guard.error) return guard.error;
   const builds = await listBuilds(guard.user.id);
   return json({ builds, maxBuilds: guard.user.maxBuilds });
}

export async function POST(req: Request) {
   const guard = await requireUser(req, { mutating: true });
   if (guard.error) return guard.error;

   const parsed = parseBuild(await req.json().catch(() => null));
   if (!parsed.ok) return fail(400, "invalid_request", parsed.error);

   const saved = await createBuild(guard.user.id, parsed.data);
   if (!saved) {
      return fail(
         403,
         "quota",
         `You've used all ${guard.user.maxBuilds} build slots. Delete one, or contact the site owner for more.`,
      );
   }
   return json({ build: saved }, 201);
}
