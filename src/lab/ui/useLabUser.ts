"use client";

import { useCallback, useEffect, useState } from "react";

export interface LabClientUser {
   id: string;
   email: string;
   role: "admin" | "user";
   maxBuilds: number;
   advisorCredits: number;
   advisorUsed: number;
   mustChangePassword: boolean;
}

/** Who is signed in to the lab (cookie session). */
export function useLabUser() {
   const [state, setState] = useState<{ loading: boolean; configured: boolean; user: LabClientUser | null }>({
      loading: true,
      configured: false,
      user: null,
   });

   const refresh = useCallback(async () => {
      try {
         const res = await fetch("/api/lab/auth/me", { cache: "no-store" });
         const body = (await res.json()) as { configured: boolean; user: LabClientUser | null };
         setState({ loading: false, configured: body.configured, user: body.user });
      } catch {
         setState({ loading: false, configured: false, user: null });
      }
   }, []);

   useEffect(() => {
      void refresh();
   }, [refresh]);

   return { ...state, refresh };
}

export async function postJson<T>(url: string, body: unknown, method = "POST"): Promise<{ ok: boolean; status: number; data: T & { error?: string; message?: string } }> {
   const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
   });
   const data = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
   return { ok: res.ok, status: res.status, data };
}
