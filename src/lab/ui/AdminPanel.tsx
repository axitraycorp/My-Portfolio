"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { postJson, useLabUser } from "./useLabUser";

interface AdminUser {
   id: string;
   email: string;
   role: "admin" | "user";
   disabled: boolean;
   maxBuilds: number;
   advisorCredits: number;
   advisorUsed: number;
   mustChangePassword: boolean;
   buildCount: number;
   createdAt: string;
}

function Secret({ email, password, onDone }: { email: string; password: string; onDone: () => void }) {
   return (
      <div className="lab-panel flex flex-col gap-xs border-camera p-s" role="alert">
         <p className="text-small">
            One-time password for <span className="font-mono">{email}</span> — copy it now, it won&apos;t be shown again:
         </p>
         <code className="select-all break-all rounded-hud bg-background p-xs font-mono text-lead">{password}</code>
         <div className="flex gap-2xs">
            <button type="button" className="lab-btn-sm" onClick={() => void navigator.clipboard?.writeText(password)}>
               Copy
            </button>
            <button type="button" className="lab-btn-sm" onClick={onDone}>
               Done
            </button>
         </div>
      </div>
   );
}

function UserRow({ u, self, onChanged, onSecret }: { u: AdminUser; self: boolean; onChanged: () => void; onSecret: (s: { email: string; password: string }) => void }) {
   const [maxBuilds, setMaxBuilds] = useState(u.maxBuilds);
   const [credits, setCredits] = useState(u.advisorCredits);
   const [msg, setMsg] = useState<string | null>(null);

   const patch = async (body: Record<string, unknown>, confirmText?: string) => {
      if (confirmText && !window.confirm(confirmText)) return;
      const res = await postJson<{ oneTimePassword?: string }>(`/api/lab/admin/users/${u.id}`, body, "PATCH");
      if (!res.ok) return setMsg(res.data.message ?? "Failed");
      if (res.data.oneTimePassword) onSecret({ email: u.email, password: res.data.oneTimePassword });
      setMsg("Updated");
      onChanged();
   };

   return (
      <li className="lab-panel flex flex-col gap-xs p-s">
         <div className="flex flex-wrap items-baseline gap-xs">
            <span className="flex-1 font-mono text-small">{u.email}</span>
            <span className="font-mono text-caption text-muted">
               {u.role}
               {u.disabled && " · disabled"}
               {u.mustChangePassword && " · one-time password"} · {u.buildCount} builds · {u.advisorUsed} reviews used
            </span>
         </div>
         <div className="flex flex-wrap items-end gap-xs">
            <label className="flex flex-col font-mono text-caption text-muted">
               Build slots
               <input type="number" min={0} max={500} value={maxBuilds} onChange={(e) => setMaxBuilds(Number(e.target.value))} className="lab-input mt-3xs w-[6rem]" />
            </label>
            <label className="flex flex-col font-mono text-caption text-muted">
               Advisor reviews (total)
               <input type="number" min={0} max={1000} value={credits} onChange={(e) => setCredits(Number(e.target.value))} className="lab-input mt-3xs w-[6rem]" />
            </label>
            <button type="button" className="lab-btn-sm" onClick={() => patch({ maxBuilds, advisorCredits: credits })}>
               Save limits
            </button>
            <button type="button" className="lab-btn-sm" onClick={() => patch({ resetPassword: true }, `Reset ${u.email}'s password? They'll be signed out.`)}>
               Reset password
            </button>
            <button type="button" className="lab-btn-sm" onClick={() => patch({ signOutEverywhere: true })}>
               Sign out everywhere
            </button>
            {!self && (
               <>
                  <button type="button" className="lab-btn-sm" onClick={() => patch({ disabled: !u.disabled })}>
                     {u.disabled ? "Enable" : "Disable"}
                  </button>
                  <button
                     type="button"
                     className="lab-btn-sm"
                     onClick={async () => {
                        if (!window.confirm(`Delete ${u.email} and all their builds? This can't be undone.`)) return;
                        const res = await postJson(`/api/lab/admin/users/${u.id}`, undefined, "DELETE");
                        if (!res.ok) return setMsg(res.data.message ?? "Failed");
                        onChanged();
                     }}
                  >
                     Delete
                  </button>
               </>
            )}
            {msg && (
               <span className="font-mono text-caption text-muted" role="status">
                  {msg}
               </span>
            )}
         </div>
      </li>
   );
}

export function AdminPanel() {
   const me = useLabUser();
   const [users, setUsers] = useState<AdminUser[] | null>(null);
   const [secret, setSecret] = useState<{ email: string; password: string } | null>(null);
   const [error, setError] = useState<string | null>(null);

   const load = useCallback(async () => {
      const res = await fetch("/api/lab/admin/users", { cache: "no-store" });
      if (!res.ok) return setError("Couldn't load accounts");
      setUsers(((await res.json()) as { users: AdminUser[] }).users);
   }, []);

   useEffect(() => {
      if (me.user?.role === "admin") void load();
   }, [me.user, load]);

   if (me.loading) return <p className="text-muted">Loading…</p>;
   if (me.user?.role !== "admin") {
      return (
         <p>
            Admins only.{" "}
            <Link href="/lab/login" className="link">
               Sign in
            </Link>
         </p>
      );
   }

   return (
      <div className="flex flex-col gap-l">
         {secret && <Secret {...secret} onDone={() => setSecret(null)} />}

         <form
            className="lab-panel grid gap-xs p-s sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
            onSubmit={async (e) => {
               e.preventDefault();
               const formEl = e.currentTarget;
               const f = new FormData(formEl);
               setError(null);
               const res = await postJson<{ user: { email: string }; oneTimePassword: string }>("/api/lab/admin/users", {
                  email: String(f.get("email") ?? ""),
                  maxBuilds: Number(f.get("maxBuilds")),
                  advisorCredits: Number(f.get("advisorCredits")),
               });
               if (!res.ok) return setError(res.data.message ?? "Couldn't create the account");
               setSecret({ email: res.data.user.email, password: res.data.oneTimePassword });
               formEl.reset();
               void load();
            }}
         >
            <label className="flex flex-col font-mono text-caption text-muted">
               New account email
               <input name="email" type="email" required className="lab-input mt-3xs" autoComplete="off" />
            </label>
            <label className="flex flex-col font-mono text-caption text-muted">
               Build slots
               <input name="maxBuilds" type="number" min={0} max={500} defaultValue={3} className="lab-input mt-3xs w-[6rem]" />
            </label>
            <label className="flex flex-col font-mono text-caption text-muted">
               Advisor reviews
               <input name="advisorCredits" type="number" min={0} max={1000} defaultValue={5} className="lab-input mt-3xs w-[6rem]" />
            </label>
            <button type="submit" className="btn btn-primary">
               Create account
            </button>
         </form>
         {error && (
            <p className="text-small text-warning" role="alert">
               {error}
            </p>
         )}

         <ul className="flex flex-col gap-xs">
            {users?.map((u) => <UserRow key={`${u.id}${u.maxBuilds}${u.advisorCredits}${u.disabled}`} u={u} self={u.id === me.user?.id} onChanged={load} onSecret={setSecret} />)}
         </ul>
      </div>
   );
}
