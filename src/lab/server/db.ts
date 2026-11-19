import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

/** Neon over HTTP: no connection pool to manage on serverless functions. */
export function sql(): NeonQueryFunction<false, false> {
   if (client) return client;
   const url = process.env.DATABASE_URL;
   if (!url) throw new Error("DATABASE_URL is not configured");
   client = neon(url);
   return client;
}

export function dbConfigured(): boolean {
   return Boolean(process.env.DATABASE_URL);
}
