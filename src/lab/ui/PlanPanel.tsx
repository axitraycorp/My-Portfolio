"use client";

import { useMemo, useState } from "react";
import { buildPlan, type PlanStep } from "../assembly/plan";
import type { Analysis } from "../engine";
import { ENVIRONMENTS } from "../engine/environments";
import { getPart } from "../model/catalog";
import type { Build } from "../model/types";
import { PartDrawing } from "./PartDrawing";
import { SceneView } from "./SceneView";
import { cablesFor, connectedPorts } from "../assembly/cables";

type Props = { build: Build; analysis: Analysis };

const WIRE_LABEL = { power: "Power", motor: "Motor", data: "Signal", invalid: "Invalid" } as const;

function StepBody({ step }: { step: PlanStep }) {
   return (
      <div className="flex flex-col gap-m pt-s">
         {step.test && (
            <div className="flex flex-col gap-xs">
               <p className="text-small">
                  <span className="mono-caps text-muted">Supply </span>
                  {step.test.supply}
               </p>
               {step.test.measurements.length > 0 && (
                  <div>
                     <p className="mono-caps mb-3xs text-muted">Measure with a multimeter</p>
                     <ul className="flex flex-col gap-3xs font-mono text-caption">
                        {step.test.measurements.map((m) => (
                           <li key={m}>▸ {m}</li>
                        ))}
                     </ul>
                  </div>
               )}
               {step.test.issues.length > 0 && (
                  <ul className="flex flex-col gap-2xs">
                     {step.test.issues.map((i) => (
                        <li key={i.id} className="flex items-start gap-xs text-small">
                           <span className="lab-sev mt-[0.15rem]" data-sev={i.severity}>
                              {i.severity}
                           </span>
                           <span>
                              <span className="font-medium">{i.title}</span> <span className="text-muted">— {i.detail}</span>
                           </span>
                        </li>
                     ))}
                  </ul>
               )}
            </div>
         )}

         {step.parts.length > 0 && (
            <div>
               <p className="mono-caps mb-xs text-muted">Parts in this step</p>
               <ul className="grid gap-s sm:grid-cols-2">
                  {step.parts.map((p) => {
                     const part = getPart(p.partId);
                     if (!part) return null;
                     return (
                        <li key={`${p.uid}${p.where}`} className="lab-panel flex flex-col gap-2xs p-xs">
                           <p className="text-small font-medium">
                              {p.count > 1 && <span className="font-mono text-camera">{p.count}× </span>}
                              {part.name} <span className="font-mono text-caption text-muted">[{p.uid}]</span>
                           </p>
                           <p className="font-mono text-caption text-muted">→ {p.where}</p>
                           {part.category !== "frame" && (
                              <div className="rounded-hud bg-background p-3xs">
                                 <PartDrawing part={part} />
                              </div>
                           )}
                        </li>
                     );
                  })}
               </ul>
            </div>
         )}

         {step.instructions.length > 0 && (
            <div>
               <p className="mono-caps mb-2xs text-muted">How</p>
               <ol className="flex list-decimal flex-col gap-2xs pl-m text-small">
                  {step.instructions.map((ins) => (
                     <li key={ins}>{ins}</li>
                  ))}
               </ol>
            </div>
         )}

         {step.hardware.length > 0 && (
            <div>
               <p className="mono-caps mb-2xs text-muted">Hardware</p>
               <ul className="grid gap-x-m gap-y-3xs font-mono text-caption sm:grid-cols-2">
                  {step.hardware.map((h) => (
                     <li key={h.item}>
                        <span className="text-camera">{h.qty}×</span> {h.item}
                     </li>
                  ))}
               </ul>
            </div>
         )}

         {step.wires && step.wires.length > 0 && (
            <div>
               <p className="mono-caps mb-2xs text-muted">Wire list</p>
               <ul className="flex flex-col gap-2xs">
                  {step.wires.map((w) => (
                     <li key={w.id} className="border-b border-line pb-2xs text-small">
                        <span className={`font-mono text-caption ${w.kind === "invalid" ? "text-warning" : "text-muted"}`}>{WIRE_LABEL[w.kind]} · </span>
                        {w.from} → {w.to}
                        <span className="block font-mono text-caption text-muted">{w.cable}</span>
                     </li>
                  ))}
               </ul>
            </div>
         )}
      </div>
   );
}

export function PlanPanel({ build, analysis }: Props) {
   const plan = useMemo(() => buildPlan(build, analysis), [build, analysis]);
   const [index, setIndex] = useState(0);
   const [replay, setReplay] = useState(0);
   const step = plan.steps[Math.min(index, plan.steps.length - 1)];
   const cables = useMemo(() => cablesFor(build, analysis), [build, analysis]);
   const connected = useMemo(() => connectedPorts(build), [build]);

   const go = (i: number) => {
      setIndex(Math.max(0, Math.min(plan.steps.length - 1, i)));
      setReplay((r) => r + 1);
   };
   const tests = plan.steps.filter((s) => s.test);
   const failing = tests.find((s) => s.test?.verdict === "fail");

   return (
      <div className="grid gap-l lg:grid-cols-[1fr_1.1fr]">
         <div className="flex flex-col gap-s lg:sticky lg:top-20 lg:self-start">
            <SceneView
               layout={analysis.layout}
               env={ENVIRONMENTS[0]}
               verdict="pass"
               moving={false}
               robotName={build.name}
               assembly={{ stage: step.stage, replay, title: `${index + 1}. ${step.title}` }}
               cables={cables}
               connected={connected}
            />
            <div className="flex flex-wrap items-center gap-2xs">
               <button type="button" className="btn btn-ghost" onClick={() => go(index - 1)} disabled={index === 0}>
                  ← Previous
               </button>
               <button type="button" className="btn btn-primary" onClick={() => go(index + 1)} disabled={index === plan.steps.length - 1}>
                  Next step →
               </button>
               <button type="button" className="lab-btn-sm" onClick={() => setReplay((r) => r + 1)}>
                  Replay
               </button>
               <span className="font-mono text-caption text-muted" aria-live="polite">
                  Step {index + 1} of {plan.steps.length}
               </span>
            </div>
            {failing ? (
               <p className="text-small text-warning">
                  Bring-up stops at “{failing.title}” — fix those problems before powering the full robot.
               </p>
            ) : (
               <p className="text-small text-success">All {tests.length} power-on test stages pass.</p>
            )}
            <details className="lab-panel p-s">
               <summary className="cursor-pointer font-display text-body font-semibold">
                  Full hardware list <span className="font-mono text-caption text-muted">({plan.hardware.reduce((n, h) => n + h.qty, 0)} items)</span>
               </summary>
               <ul className="mt-s grid gap-x-m gap-y-3xs font-mono text-caption sm:grid-cols-2">
                  {plan.hardware.map((h) => (
                     <li key={h.item}>
                        <span className="text-camera">{h.qty}×</span> {h.item}
                     </li>
                  ))}
               </ul>
            </details>
         </div>

         <ol className="flex flex-col gap-xs" aria-label="Assembly and bring-up steps">
            {plan.steps.map((s, i) => {
               const open = i === index;
               const sev = s.test ? s.test.verdict : null;
               return (
                  <li key={s.id} className="lab-row lab-panel p-s" data-highlight={open ? "" : undefined}>
                     <button
                        type="button"
                        className="flex w-full items-center gap-xs text-left"
                        aria-expanded={open}
                        aria-current={open ? "step" : undefined}
                        onClick={() => go(i)}
                     >
                        <span className="w-[2.5ch] font-mono text-small text-muted">{i + 1}</span>
                        <span className="flex-1 font-display text-body font-semibold">{s.title}</span>
                        {sev && (
                           <span className="lab-sev" data-sev={sev}>
                              {sev}
                           </span>
                        )}
                        {!sev && s.parts.length > 0 && (
                           <span className="font-mono text-caption text-muted">{s.parts.reduce((n, p) => n + p.count, 0)} parts</span>
                        )}
                     </button>
                     {open && <StepBody step={s} />}
                  </li>
               );
            })}
         </ol>
      </div>
   );
}
