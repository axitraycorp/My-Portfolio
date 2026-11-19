"use client";

import Link from "next/link";
import { useState } from "react";
import { postJson, useLabUser } from "./useLabUser";

const MIN_LENGTH = 12;

export function AccountPanel() {
   const { loading, user, refresh } = useLabUser();
   const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
   const [busy, setBusy] = useState(false);

   if (loading) return <p className="text-muted">Loading…</p>;
   if (!user) {
      return (
         <p>
            You&apos;re not signed in.{" "}
            <Link href="/lab/login" className="link">
               Sign in
            </Link>
         </p>
      );
   }

   return (
      <div className="flex flex-col gap-l">
         <dl className="lab-dl lab-panel p-s">
            <dt>Email</dt>
            <dd className="font-mono">{user.email}</dd>
            <dt>Role</dt>
            <dd>{user.role}</dd>
            <dt>Build slots</dt>
            <dd>{user.maxBuilds}</dd>
            <dt>Advisor reviews</dt>
            <dd>
               {Math.max(0, user.advisorCredits - user.advisorUsed)} left of {user.advisorCredits}
            </dd>
         </dl>
         <p className="text-small text-muted">Need more build slots or advisor reviews? Contact the site owner directly.</p>

         <form
            className="lab-panel flex flex-col gap-s p-m"
            onSubmit={async (e) => {
               e.preventDefault();
               const formEl = e.currentTarget;
               const form = new FormData(formEl);
               const next = String(form.get("next") ?? "");
               if (next !== String(form.get("confirm") ?? "")) return setMsg({ tone: "error", text: "The new passwords don't match" });
               setBusy(true);
               const res = await postJson("/api/lab/auth/password", { current: String(form.get("current") ?? ""), next });
               setBusy(false);
               if (!res.ok) return setMsg({ tone: "error", text: res.data.message ?? "Couldn't change the password" });
               formEl.reset();
               setMsg({ tone: "ok", text: "Password changed. Other devices have been signed out." });
               void refresh();
            }}
         >
            <h2 className="font-display text-lead font-semibold">{user.mustChangePassword ? "Set your own password" : "Change password"}</h2>
            {user.mustChangePassword && (
               <p className="text-small text-warning">You signed in with a one-time password. Choose a new one now.</p>
            )}
            <div>
               <label htmlFor="current" className="mono-caps text-muted">
                  Current password
               </label>
               <input id="current" name="current" type="password" autoComplete="current-password" required className="lab-input mt-3xs" />
            </div>
            <div>
               <label htmlFor="next" className="mono-caps text-muted">
                  New password (at least {MIN_LENGTH} characters)
               </label>
               <input
                  id="next"
                  name="next"
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_LENGTH}
                  required
                  className="lab-input mt-3xs"
               />
            </div>
            <div>
               <label htmlFor="confirm" className="mono-caps text-muted">
                  Repeat new password
               </label>
               <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_LENGTH}
                  required
                  className="lab-input mt-3xs"
               />
            </div>
            {msg && (
               <p className={`text-small ${msg.tone === "error" ? "text-warning" : "text-success"}`} role="status">
                  {msg.text}
               </p>
            )}
            <button type="submit" className="btn btn-primary" disabled={busy}>
               {busy ? "Saving…" : "Change password"}
            </button>
         </form>
         <Link href="/lab" className="link">
            ← Back to the lab
         </Link>
      </div>
   );
}
