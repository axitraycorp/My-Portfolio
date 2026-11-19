"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "./useLabUser";

export function LoginForm() {
   const router = useRouter();
   const [error, setError] = useState<string | null>(null);
   const [busy, setBusy] = useState(false);

   return (
      <form
         className="lab-panel flex flex-col gap-s p-m"
         onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setBusy(true);
            setError(null);
            const res = await postJson<{ user: { mustChangePassword: boolean } }>("/api/lab/auth/login", {
               email: String(form.get("email") ?? ""),
               password: String(form.get("password") ?? ""),
            });
            setBusy(false);
            if (!res.ok) return setError(res.data.message ?? "Sign-in failed");
            router.push(res.data.user.mustChangePassword ? "/lab/account" : "/lab");
            router.refresh();
         }}
      >
         <div>
            <label htmlFor="email" className="mono-caps text-muted">
               Email
            </label>
            <input id="email" name="email" type="email" autoComplete="username" required className="lab-input mt-3xs" />
         </div>
         <div>
            <label htmlFor="password" className="mono-caps text-muted">
               Password
            </label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className="lab-input mt-3xs" />
         </div>
         {error && (
            <p className="text-small text-warning" role="alert">
               {error}
            </p>
         )}
         <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
         </button>
      </form>
   );
}
