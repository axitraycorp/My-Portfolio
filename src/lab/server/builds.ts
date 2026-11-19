import "server-only";
import { randomUUID } from "crypto";
import type { Build } from "../model/types";
import { sql } from "./db";

export interface SavedBuildSummary {
   id: string;
   name: string;
   archetype: string;
   updatedAt: string;
}

export interface SavedBuild extends SavedBuildSummary {
   build: Build;
}

interface Row {
   id: string;
   name: string;
   archetype: string;
   data: Build;
   updated_at: string | Date;
}

export async function listBuilds(userId: string): Promise<SavedBuildSummary[]> {
   const rows = (await sql()`
      SELECT id, name, archetype, updated_at FROM lab_builds
      WHERE user_id = ${userId} ORDER BY updated_at DESC`) as Row[];
   return rows.map((r) => ({ id: r.id, name: r.name, archetype: r.archetype, updatedAt: new Date(r.updated_at).toISOString() }));
}

export async function getBuild(userId: string, id: string): Promise<SavedBuild | null> {
   const rows = (await sql()`
      SELECT id, name, archetype, data, updated_at FROM lab_builds
      WHERE id = ${id} AND user_id = ${userId}`) as Row[];
   const r = rows[0];
   return r ? { id: r.id, name: r.name, archetype: r.archetype, updatedAt: new Date(r.updated_at).toISOString(), build: r.data } : null;
}

/** Inserts only while the user is under their quota; null when the quota is used up. */
export async function createBuild(userId: string, build: Build): Promise<SavedBuildSummary | null> {
   const rows = (await sql()`
      INSERT INTO lab_builds (id, user_id, name, archetype, data, updated_at)
      SELECT ${randomUUID()}, ${userId}, ${build.name}, ${build.archetype}, ${JSON.stringify(build)}::jsonb, now()
      WHERE (SELECT COUNT(*) FROM lab_builds WHERE user_id = ${userId})
          < (SELECT max_builds FROM lab_users WHERE id = ${userId})
      RETURNING id, name, archetype, updated_at`) as Row[];
   const r = rows[0];
   return r ? { id: r.id, name: r.name, archetype: r.archetype, updatedAt: new Date(r.updated_at).toISOString() } : null;
}

export async function updateBuild(userId: string, id: string, build: Build): Promise<SavedBuildSummary | null> {
   const rows = (await sql()`
      UPDATE lab_builds SET name = ${build.name}, archetype = ${build.archetype},
         data = ${JSON.stringify(build)}::jsonb, updated_at = now()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id, name, archetype, updated_at`) as Row[];
   const r = rows[0];
   return r ? { id: r.id, name: r.name, archetype: r.archetype, updatedAt: new Date(r.updated_at).toISOString() } : null;
}

export async function deleteBuild(userId: string, id: string): Promise<boolean> {
   const rows = (await sql()`DELETE FROM lab_builds WHERE id = ${id} AND user_id = ${userId} RETURNING id`) as Row[];
   return rows.length === 1;
}
