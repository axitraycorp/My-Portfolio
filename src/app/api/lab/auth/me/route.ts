import { json, publicUser } from "@/lab/server/http";
import { authConfigured, getSessionUser } from "@/lab/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
   const user = await getSessionUser();
   return json({ configured: authConfigured(), user: user ? publicUser(user) : null });
}
