import { fail, json, sameOrigin } from "@/lab/server/http";
import { endSession } from "@/lab/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
   if (!sameOrigin(req)) return fail(403, "forbidden");
   await endSession();
   return json({ ok: true });
}
