import "server-only";
import { randomUUID } from "crypto";
import { sql } from "./db";

export interface LabUser {
   id: string;
   email: string;
   role: "admin" | "user";
   disabled: boolean;
   maxBuilds: number;
   advisorCredits: number;
   advisorUsed: number;
   sessionVersion: number;
   mustChangePassword: boolean;
   createdAt: string;
}

interface Row {
   id: string;
   email: string;
   password_hash: string;
   role: string;
   disabled: boolean;
   max_builds: number;
   advisor_credits: number;
   advisor_used: number;
   session_version: number;
   must_change_password: boolean;
   created_at: string | Date;
   build_count?: number;
}

const toUser = (r: Row): LabUser => ({
   id: r.id,
   email: r.email,
   role: r.role === "admin" ? "admin" : "user",
   disabled: r.disabled,
   maxBuilds: r.max_builds,
   advisorCredits: r.advisor_credits,
   advisorUsed: r.advisor_used,
   sessionVersion: r.session_version,
   mustChangePassword: r.must_change_password,
   createdAt: new Date(r.created_at).toISOString(),
});

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

export async function findUserById(id: string): Promise<LabUser | null> {
   const rows = (await sql()`SELECT * FROM lab_users WHERE id = ${id}`) as Row[];
   return rows[0] ? toUser(rows[0]) : null;
}

/** Includes the password hash — only for login. */
export async function findUserForLogin(email: string): Promise<(LabUser & { passwordHash: string }) | null> {
   const rows = (await sql()`SELECT * FROM lab_users WHERE email = ${normaliseEmail(email)}`) as Row[];
   return rows[0] ? { ...toUser(rows[0]), passwordHash: rows[0].password_hash } : null;
}

export async function listUsers(): Promise<(LabUser & { buildCount: number })[]> {
   const rows = (await sql()`
      SELECT u.*, (SELECT COUNT(*)::int FROM lab_builds b WHERE b.user_id = u.id) AS build_count
      FROM lab_users u ORDER BY u.created_at ASC`) as Row[];
   return rows.map((r) => ({ ...toUser(r), buildCount: r.build_count ?? 0 }));
}

export async function createUser(input: {
   email: string;
   passwordHash: string;
   role: "admin" | "user";
   maxBuilds: number;
   advisorCredits: number;
}): Promise<LabUser> {
   const rows = (await sql()`
      INSERT INTO lab_users (id, email, password_hash, role, max_builds, advisor_credits, must_change_password)
      VALUES (${randomUUID()}, ${normaliseEmail(input.email)}, ${input.passwordHash}, ${input.role},
              ${input.maxBuilds}, ${input.advisorCredits}, true)
      RETURNING *`) as Row[];
   return toUser(rows[0]);
}

export async function updateUserLimits(
   id: string,
   patch: { maxBuilds?: number; advisorCredits?: number; disabled?: boolean },
): Promise<LabUser | null> {
   const rows = (await sql()`
      UPDATE lab_users SET
         max_builds = COALESCE(${patch.maxBuilds ?? null}::int, max_builds),
         advisor_credits = COALESCE(${patch.advisorCredits ?? null}::int, advisor_credits),
         disabled = COALESCE(${patch.disabled ?? null}::boolean, disabled),
         session_version = CASE WHEN ${patch.disabled === true} THEN session_version + 1 ELSE session_version END
      WHERE id = ${id}
      RETURNING *`) as Row[];
   return rows[0] ? toUser(rows[0]) : null;
}

export async function setPassword(id: string, passwordHash: string, mustChange: boolean): Promise<LabUser | null> {
   const rows = (await sql()`
      UPDATE lab_users SET password_hash = ${passwordHash}, must_change_password = ${mustChange},
         session_version = session_version + 1
      WHERE id = ${id} RETURNING *`) as Row[];
   return rows[0] ? toUser(rows[0]) : null;
}

export async function bumpSessionVersion(id: string): Promise<void> {
   await sql()`UPDATE lab_users SET session_version = session_version + 1 WHERE id = ${id}`;
}

export async function deleteUser(id: string): Promise<void> {
   await sql()`DELETE FROM lab_users WHERE id = ${id}`;
}

/** Atomically takes one advisor credit; false if none are left. */
export async function consumeAdvisorCredit(id: string): Promise<boolean> {
   const rows = (await sql()`
      UPDATE lab_users SET advisor_used = advisor_used + 1
      WHERE id = ${id} AND advisor_used < advisor_credits AND NOT disabled
      RETURNING id`) as { id: string }[];
   return rows.length === 1;
}

export async function refundAdvisorCredit(id: string): Promise<void> {
   await sql()`UPDATE lab_users SET advisor_used = GREATEST(advisor_used - 1, 0) WHERE id = ${id}`;
}
