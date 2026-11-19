#!/usr/bin/env node
/**
 * Creates (or resets) the Robot Lab admin account and prints a one-time password.
 *
 *   DATABASE_URL=postgres://… node scripts/lab-create-admin.mjs you@example.com [--reset]
 *
 * Uses the same scrypt format as src/lab/server/password.ts.
 */
import { randomBytes, randomUUID, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { neon } from "@neondatabase/serverless";

const [email, flag] = process.argv.slice(2);
if (!email || !email.includes("@")) {
   console.error("Usage: node scripts/lab-create-admin.mjs <email> [--reset]");
   process.exit(1);
}
if (!process.env.DATABASE_URL) {
   console.error("DATABASE_URL is not set");
   process.exit(1);
}

const N = 16384;
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const password = Array.from(randomBytes(16), (b) => alphabet[b % alphabet.length]).join("");
const salt = randomBytes(16);
const hash = await promisify(scrypt)(password, salt, 64, { N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
const stored = `scrypt$${N}$8$1$${salt.toString("base64")}$${hash.toString("base64")}`;

const sql = neon(process.env.DATABASE_URL);
const normalised = email.trim().toLowerCase();
const existing = await sql`SELECT id FROM lab_users WHERE email = ${normalised}`;

if (existing.length > 0) {
   if (flag !== "--reset") {
      console.error(`${normalised} already exists. Pass --reset to issue a new one-time password.`);
      process.exit(1);
   }
   await sql`UPDATE lab_users SET password_hash = ${stored}, role = 'admin', disabled = false,
      must_change_password = true, session_version = session_version + 1 WHERE email = ${normalised}`;
} else {
   await sql`INSERT INTO lab_users (id, email, password_hash, role, max_builds, advisor_credits, must_change_password)
      VALUES (${randomUUID()}, ${normalised}, ${stored}, 'admin', 100, 1000, true)`;
}

console.log(`Admin account: ${normalised}`);
console.log(`One-time password: ${password}`);
console.log("Sign in at /lab/login and choose your own password.");
