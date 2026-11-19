import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { findUserById, type LabUser } from "./users";

export const SESSION_COOKIE = "lab_session";
const SESSION_DAYS = 7;

function secret(): Uint8Array {
   const value = process.env.AUTH_SECRET;
   if (!value || value.length < 32) throw new Error("AUTH_SECRET must be set (32+ characters)");
   return new TextEncoder().encode(value);
}

export function authConfigured(): boolean {
   return Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32 && process.env.DATABASE_URL);
}

export async function startSession(user: LabUser): Promise<void> {
   const token = await new SignJWT({ v: user.sessionVersion })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime(`${SESSION_DAYS}d`)
      .sign(secret());
   (await cookies()).set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DAYS * 24 * 60 * 60,
   });
}

export async function endSession(): Promise<void> {
   (await cookies()).delete(SESSION_COOKIE);
}

/**
 * The signed-in user, or null. A token stops working when the account is
 * disabled or its session version moves on (password change, "sign out everywhere").
 */
export async function getSessionUser(): Promise<LabUser | null> {
   if (!authConfigured()) return null;
   const token = (await cookies()).get(SESSION_COOKIE)?.value;
   if (!token) return null;
   try {
      const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
      if (typeof payload.sub !== "string" || typeof payload.v !== "number") return null;
      const user = await findUserById(payload.sub);
      if (!user || user.disabled || user.sessionVersion !== payload.v) return null;
      return user;
   } catch {
      return null;
   }
}
