"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getArchetype } from "../model/archetypes";
import type { ArchetypeId } from "../model/types";
import { postJson, useLabUser } from "./useLabUser";

interface Summary {
   id: string;
   name: string;
   archetype: string;
   updatedAt: string;
}

/** Sign-in state and the signed-in user's saved builds. */
export function LabAccountBar() {
   const { loading, configured, user } = useLabUser();
   const [builds, setBuilds] = useState<Summary[] | null>(null);

   useEffect(() => {
      if (!user) return;
      void fetch("/api/lab/builds", { cache: "no-store" })
         .then((r) => (r.ok ? r.json() : { builds: [] }))
         .then((b: { builds: Summary[] }) => setBuilds(b.builds));
   }, [user]);

   if (loading) return <p className="min-h-[2.75rem] font-mono text-small text-muted">Checking account…</p>;

   if (!user) {
      return (
         <p className="min-h-[2.75rem] text-small text-muted">
            Anyone can design and test. Invited accounts can also save builds and ask the AI advisor.{" "}
            {configured && (
               <Link href="/lab/login" className="link">
                  Sign in
               </Link>
            )}
         </p>
      );
   }

   return (
      <div className="lab-panel flex flex-col gap-s p-s">
         <div className="flex flex-wrap items-center justify-between gap-xs">
            <p className="text-small">
               Signed in as <span className="font-mono">{user.email}</span>
               <span className="ml-xs font-mono text-caption text-muted">
                  {builds?.length ?? "…"}/{user.maxBuilds} builds · {Math.max(0, user.advisorCredits - user.advisorUsed)} advisor reviews left
               </span>
            </p>
            <div className="flex flex-wrap gap-2xs">
               <Link href="/lab/account" className="lab-btn-sm">
                  Account
               </Link>
               {user.role === "admin" && (
                  <Link href="/lab/admin" className="lab-btn-sm">
                     Admin
                  </Link>
               )}
               <button
                  type="button"
                  className="lab-btn-sm"
                  onClick={async () => {
                     await postJson("/api/lab/auth/logout", undefined);
                     window.location.reload();
                  }}
               >
                  Sign out
               </button>
            </div>
         </div>
         {user.mustChangePassword && (
            <p className="text-small text-warning">
               You&apos;re using a one-time password.{" "}
               <Link href="/lab/account" className="link">
                  Set your own
               </Link>
               .
            </p>
         )}
         {builds && builds.length > 0 && (
            <ul className="flex flex-col gap-3xs">
               {builds.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-baseline gap-xs text-small">
                     <Link href={`/lab/build?id=${b.id}`} className="link">
                        {b.name}
                     </Link>
                     <span className="font-mono text-caption text-muted">
                        {getArchetype(b.archetype as ArchetypeId)?.name ?? b.archetype} · {new Date(b.updatedAt).toLocaleDateString()}
                     </span>
                  </li>
               ))}
            </ul>
         )}
         {builds && builds.length === 0 && <p className="text-small text-muted">No saved builds yet — open a robot and press Save.</p>}
      </div>
   );
}
