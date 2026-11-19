import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";

/* Password hashing with Node's built-in scrypt (memory-hard, salted). */

const scrypt = promisify(scryptCb) as (
   password: string,
   salt: Buffer,
   keylen: number,
   options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 64 * 1024 * 1024;

export const MIN_PASSWORD_LENGTH = 12;

export async function hashPassword(password: string): Promise<string> {
   const salt = randomBytes(16);
   const hash = await scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
   return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
   const parts = stored.split("$");
   if (parts.length !== 6 || parts[0] !== "scrypt") return false;
   const [, n, r, p, saltB64, hashB64] = parts;
   const expected = Buffer.from(hashB64, "base64");
   const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: MAXMEM,
   });
   return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Readable random password for new accounts (shown once to the admin). */
export function generatePassword(length = 16): string {
   const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
   const bytes = randomBytes(length);
   return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
