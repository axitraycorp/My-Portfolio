"use client";

import Link from "next/link";
import { Fragment, useRef, useState } from "react";
import type { Build } from "../model/types";
import type { LabClientUser } from "./useLabUser";

type Props = { build: Build; user: LabClientUser | null; loading: boolean; onUsed: () => void };

/** Bold spans only; everything else is plain text (React escapes it). */
function inline(text: string) {
   return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
   );
}

/** Minimal Markdown: headings, bullet and numbered lists, paragraphs. */
function Advice({ text }: { text: string }) {
   const blocks: React.ReactNode[] = [];
   let list: { ordered: boolean; items: string[] } | null = null;
   const flush = () => {
      if (!list) return;
      const items = list.items.map((t, i) => <li key={i}>{inline(t)}</li>);
      blocks.push(list.ordered ? <ol key={blocks.length}>{items}</ol> : <ul key={blocks.length}>{items}</ul>);
      list = null;
   };
   for (const raw of text.split("\n")) {
      const line = raw.trim();
      const bullet = /^[-*•]\s+(.*)/.exec(line);
      const numbered = /^\d+[.)]\s+(.*)/.exec(line);
      if (bullet || numbered) {
         const ordered = Boolean(numbered);
         if (!list || list.ordered !== ordered) {
            flush();
            list = { ordered, items: [] };
         }
         list.items.push((bullet ?? numbered)![1]);
         continue;
      }
      flush();
      if (!line) continue;
      const heading = /^#{1,4}\s+(.*)/.exec(line);
      blocks.push(heading ? <h3 key={blocks.length}>{inline(heading[1])}</h3> : <p key={blocks.length}>{inline(line)}</p>);
   }
   flush();
   return <div className="lab-advice text-small">{blocks}</div>;
}

export function AdvisorPanel({ build, user, loading, onUsed }: Props) {
   const [text, setText] = useState("");
   const [status, setStatus] = useState<"idle" | "streaming" | "done" | "error">("idle");
   const [message, setMessage] = useState<string | null>(null);
   const abort = useRef<AbortController | null>(null);

   const left = user ? Math.max(0, user.advisorCredits - user.advisorUsed) : 0;

   async function ask() {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      setText("");
      setMessage(null);
      setStatus("streaming");
      try {
         const res = await fetch("/api/lab/advisor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(build),
            signal: ctrl.signal,
         });
         if (!res.ok || !res.body) {
            const body = (await res.json().catch(() => ({}))) as { message?: string };
            setMessage(body.message ?? "The advisor is unavailable right now. The simulator checks still apply.");
            setStatus("error");
            return;
         }
         onUsed();
         const reader = res.body.getReader();
         const decoder = new TextDecoder();
         let buffer = "";
         for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
               if (!line.trim()) continue;
               const event = JSON.parse(line) as { type: string; text?: string };
               if (event.type === "text" && event.text) setText((t) => t + event.text);
               if (event.type === "error") {
                  setMessage("The review was interrupted. If no text arrived, your credit was returned.");
                  setStatus("error");
               }
            }
         }
         setStatus((s) => (s === "error" ? s : "done"));
      } catch {
         if (!ctrl.signal.aborted) {
            setMessage("Couldn't reach the advisor. Check your connection.");
            setStatus("error");
         }
      }
   }

   return (
      <div className="flex flex-col gap-s">
         <div>
            <h3 className="font-display text-lead font-semibold">AI build advisor</h3>
            <p className="mt-3xs max-w-[60ch] text-small text-muted">
               Claude reads your parts, wiring and every simulator finding, then explains what to fix first and which upgrades matter most
               for this robot type.
            </p>
         </div>

         {loading ? (
            <p className="text-muted">Checking your account…</p>
         ) : !user ? (
            <p className="lab-panel p-s text-small">
               The advisor is available to invited accounts.{" "}
               <Link href="/lab/login" className="link">
                  Sign in
               </Link>{" "}
               — or keep using the simulator checks, which are free and instant.
            </p>
         ) : (
            <div className="flex flex-wrap items-center gap-s">
               <button type="button" className="btn btn-primary" onClick={ask} disabled={status === "streaming" || left === 0}>
                  {status === "streaming" ? "Reviewing…" : "Review this build"}
               </button>
               <span className="font-mono text-caption text-muted" aria-live="polite">
                  {left} of {user.advisorCredits} reviews left
                  {left === 0 && " — ask the site owner for more"}
               </span>
            </div>
         )}

         {message && (
            <p className="text-small text-warning" role="alert">
               {message}
            </p>
         )}
         {text && (
            <section className="lab-panel p-s" aria-live="polite" aria-busy={status === "streaming"}>
               <Advice text={text} />
            </section>
         )}
      </div>
   );
}
