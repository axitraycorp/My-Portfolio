"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Analysis } from "../engine";
import { parseGuideTool, type GuideToolCall } from "../guide/ai";
import { guideState, type GuideStageId, type GuideTab } from "../guide/steps";
import { getPart } from "../model/catalog";
import type { Build, PortRef } from "../model/types";
import { PartDrawing } from "./PartDrawing";
import { Unit7Avatar } from "./Unit7Avatar";
import type { LabClientUser } from "./useLabUser";

export interface GuideActions {
   addPart: (partId: string, count: number) => void;
   connect: (from: PortRef, to: PortRef) => void;
   openTab: (tab: GuideTab) => void;
   highlight: (uids: string[]) => void;
}

type Props = {
   build: Build;
   analysis: Analysis;
   planSeen: boolean;
   actions: GuideActions;
   user: LabClientUser | null;
   onCreditUsed: () => void;
};

type Chat = { role: "user" | "assistant"; content: string };

export function GuidePanel({ build, analysis, planSeen, actions, user, onCreditUsed }: Props) {
   const [skipped, setSkipped] = useState<Set<GuideStageId>>(new Set());
   const state = useMemo(() => guideState(build, analysis, { skipped, planSeen }), [build, analysis, skipped, planSeen]);
   const step = state.current;
   const { highlight } = actions;
   const doneCount = state.stages.filter((s) => s.done).length;
   const mood = analysis.report.counts.error > 0 && step.stage === "checks" ? "error" : step.stage === "done" ? "ok" : analysis.report.counts.warning ? "warn" : "ok";

   // Point at what this step is about
   const highlightKey = step.highlight.join(",");
   useEffect(() => {
      highlight(highlightKey ? highlightKey.split(",") : []);
   }, [highlightKey, highlight]);

   // ── AI chat
   const [chat, setChat] = useState<Chat[]>([]);
   const [answer, setAnswer] = useState("");
   const [busy, setBusy] = useState(false);
   const [note, setNote] = useState<string | null>(null);
   const questionId = useId();
   const abort = useRef<AbortController | null>(null);

   function runTool(call: GuideToolCall): string {
      switch (call.name) {
         case "add_part":
            actions.addPart(call.input.part_id, call.input.count);
            return `added ${call.input.count}× ${getPart(call.input.part_id)?.name}`;
         case "connect": {
            const [fu, fp] = call.input.from.split(":");
            const [tu, tp] = call.input.to.split(":");
            actions.connect({ uid: fu, port: fp }, { uid: tu, port: tp });
            return `connected ${call.input.from} → ${call.input.to}`;
         }
         case "open_tab":
            actions.openTab(call.input.tab);
            return `opened ${call.input.tab}`;
         case "highlight":
            actions.highlight(call.input.uids);
            return `highlighted ${call.input.uids.join(", ")}`;
      }
   }

   async function ask(question: string) {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      setBusy(true);
      setAnswer("");
      setNote(null);
      let text = "";
      const done: string[] = [];
      try {
         const res = await fetch("/api/lab/guide", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question, history: chat.slice(-6), build }),
            signal: ctrl.signal,
         });
         if (!res.ok || !res.body) {
            const body = (await res.json().catch(() => ({}))) as { message?: string };
            setNote(body.message ?? "Unit-7's AI is unavailable right now — the guided steps still work.");
            return;
         }
         onCreditUsed();
         const reader = res.body.getReader();
         const decoder = new TextDecoder();
         let buffer = "";
         for (;;) {
            const { value, done: end } = await reader.read();
            if (end) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
               if (!line.trim()) continue;
               const e = JSON.parse(line) as { type: string; text?: string; name?: string; input?: unknown };
               if (e.type === "text" && e.text) {
                  text += e.text;
                  setAnswer(text);
               } else if (e.type === "tool" && e.name) {
                  const call = parseGuideTool(e.name, e.input, build);
                  if (call) done.push(runTool(call));
               } else if (e.type === "error") {
                  setNote("The answer was cut off. If nothing arrived, your question wasn't counted.");
               }
            }
         }
         if (done.length) setNote(`Unit-7 ${done.join("; ")}.`);
         setChat((c) => [...c, { role: "user" as const, content: question }, { role: "assistant" as const, content: text || "(made changes)" }].slice(-8));
      } catch {
         if (!ctrl.signal.aborted) setNote("Couldn't reach Unit-7. Check your connection.");
      } finally {
         setBusy(false);
      }
   }

   const left = user ? Math.max(0, user.advisorCredits - user.advisorUsed) : 0;

   return (
      <section className="flex flex-col gap-s" aria-labelledby="guide-title">
         <div className="flex items-start gap-s">
            <Unit7Avatar mood={mood} talking={busy} />
            <div className="min-w-0 flex-1">
               <div className="flex items-baseline justify-between gap-xs">
                  <h2 id="guide-title" className="font-display text-lead font-semibold">
                     Unit-7 · build guide
                  </h2>
                  <span className="font-mono text-caption text-muted">
                     {doneCount}/{state.stages.length - 1}
                  </span>
               </div>
               <p className="lab-bubble mt-2xs text-small" aria-live="polite">
                  <span className="mono-caps mr-2xs text-camera">{step.title}</span>
                  {answer || step.say}
               </p>
            </div>
         </div>

         <ol className="flex flex-wrap gap-3xs" aria-label="Build stages">
            {state.stages
               .filter((s) => s.id !== "done")
               .map((s) => (
                  <li
                     key={s.id}
                     className="rounded-full border px-2xs py-[0.05rem] font-mono text-[0.68rem]"
                     style={{
                        borderColor: s.id === step.stage ? "var(--camera)" : "var(--line)",
                        color: s.done ? "var(--success)" : s.id === step.stage ? "var(--ink)" : "var(--muted)",
                     }}
                     aria-current={s.id === step.stage ? "step" : undefined}
                  >
                     {s.done ? "✓ " : ""}
                     {s.title}
                  </li>
               ))}
         </ol>

         {step.parts.length > 0 && (
            <ul className="flex flex-col gap-2xs" aria-label="Suggested parts">
               {step.parts.map((sug) => {
                  const part = getPart(sug.partId);
                  if (!part) return null;
                  return (
                     <li key={sug.partId} className="lab-panel flex items-center gap-xs p-2xs">
                        {part.category !== "frame" && (
                           <span className="w-16 flex-none" aria-hidden="true">
                              <PartDrawing part={part} compact />
                           </span>
                        )}
                        <span className="min-w-0 flex-1">
                           <span className="block text-small font-medium">
                              {sug.count > 1 && <span className="font-mono text-camera">{sug.count}× </span>}
                              {part.name}
                              {sug.recommended && <span className="ml-2xs font-mono text-caption text-success">recommended</span>}
                           </span>
                           <span className="block font-mono text-caption text-muted">{sug.reason}</span>
                        </span>
                        <button type="button" className="lab-btn-sm" onClick={() => actions.addPart(sug.partId, sug.count)} aria-label={`Add ${sug.count} × ${part.name}`}>
                           + Add
                        </button>
                     </li>
                  );
               })}
            </ul>
         )}

         {step.wires.length > 0 && (
            <div className="flex flex-col gap-2xs">
               <ul className="flex flex-col gap-3xs" aria-label="Suggested wires">
                  {step.wires.map((w) => (
                     <li key={`${w.from.uid}:${w.from.port}>${w.to.uid}:${w.to.port}`} className="flex items-center gap-xs border-b border-line pb-3xs text-small">
                        <span className="min-w-0 flex-1">{w.text}</span>
                        <button type="button" className="lab-btn-sm" onClick={() => actions.connect(w.from, w.to)} aria-label={`Connect ${w.text}`}>
                           Connect
                        </button>
                     </li>
                  ))}
               </ul>
               <button type="button" className="btn btn-ghost self-start" onClick={() => step.wires.forEach((w) => actions.connect(w.from, w.to))}>
                  Connect all {step.wires.length}
               </button>
            </div>
         )}

         <div className="flex flex-wrap gap-2xs">
            {step.tab && (
               <button type="button" className="btn btn-primary" onClick={() => actions.openTab(step.tab!)}>
                  {step.stage === "assemble" ? "Open the assembly plan" : step.stage === "checks" ? "Show the problem" : "Show me"}
               </button>
            )}
            {step.optional && step.stage !== "done" && (
               <button type="button" className="btn btn-ghost" onClick={() => setSkipped((s) => new Set(s).add(step.stage))}>
                  {step.stage === "brain" ? "That's enough — continue" : "Skip this step"}
               </button>
            )}
         </div>

         <form
            className="flex flex-col gap-2xs border-t border-line pt-s"
            onSubmit={(e) => {
               e.preventDefault();
               const input = e.currentTarget.elements.namedItem("q") as HTMLInputElement;
               const q = input.value.trim();
               if (!q || busy) return;
               input.value = "";
               void ask(q);
            }}
         >
            <label htmlFor={questionId} className="mono-caps text-muted">
               Ask Unit-7
            </label>
            {user ? (
               <>
                  <div className="flex gap-2xs">
                     <input
                        id={questionId}
                        name="q"
                        className="lab-input"
                        maxLength={500}
                        placeholder="e.g. Why do I need a buck converter? Wire the LiDAR for me."
                        disabled={busy || left === 0}
                        autoComplete="off"
                     />
                     <button type="submit" className="btn btn-primary" disabled={busy || left === 0}>
                        {busy ? "…" : "Ask"}
                     </button>
                  </div>
                  <span className="font-mono text-caption text-muted">
                     {left} AI question{left === 1 ? "" : "s"} left{left === 0 ? " — ask the site owner for more" : ""}. Unit-7 can add parts, connect wires and point at things.
                  </span>
               </>
            ) : (
               <p id={questionId} className="text-small text-muted">
                  The steps above work for everyone.{" "}
                  <Link href="/lab/login" className="link">
                     Sign in
                  </Link>{" "}
                  to ask Unit-7 questions in your own words.
               </p>
            )}
            {note && (
               <p className="text-small text-camera" role="status">
                  {note}
               </p>
            )}
         </form>
      </section>
   );
}
