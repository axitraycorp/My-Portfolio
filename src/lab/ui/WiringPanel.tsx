"use client";

import { useId, useMemo, useState } from "react";
import type { Build, Issue } from "../model/types";
import { Schematic } from "./Schematic";
import { isCompatible, listPorts, refValue, wireKind } from "./ports";

type Props = {
   build: Build;
   issues: Issue[];
   highlight: Set<string>;
   onAddWire: (from: string, to: string) => void;
   onRemoveWire: (id: string) => void;
};

export function WiringPanel({ build, issues, highlight, onAddWire, onRemoveWire }: Props) {
   const ports = useMemo(() => listPorts(build), [build]);
   const [from, setFrom] = useState("");
   const [to, setTo] = useState("");
   const fromId = useId();
   const toId = useId();

   const faulty = useMemo(() => {
      const ids = new Set<string>();
      for (const i of issues) if (i.severity !== "info") i.wireIds?.forEach((w) => ids.add(w));
      return ids;
   }, [issues]);
   const issuesByWire = useMemo(() => {
      const map = new Map<string, Issue[]>();
      for (const i of issues) for (const w of i.wireIds ?? []) map.set(w, [...(map.get(w) ?? []), i]);
      return map;
   }, [issues]);

   const fromPort = ports.find((p) => p.value === from);
   const targets = ports.filter((p) => p.ref.uid !== fromPort?.ref.uid);
   const good = fromPort ? targets.filter((p) => isCompatible(fromPort.port, p.port)) : [];
   const other = fromPort ? targets.filter((p) => !isCompatible(fromPort.port, p.port)) : [];

   const byPart = useMemo(() => {
      const groups = new Map<string, typeof ports>();
      for (const p of ports) {
         const k = `${p.partName} [${p.ref.uid}]`;
         groups.set(k, [...(groups.get(k) ?? []), p]);
      }
      return [...groups.entries()];
   }, [ports]);

   const label = (v: { uid: string; port: string }) => {
      const p = ports.find((x) => x.value === refValue(v));
      return p ? `${p.partName} · ${p.port.label}` : `${v.uid}.${v.port} (missing)`;
   };

   return (
      <div className="flex flex-col gap-l">
         <Schematic build={build} faultyWires={faulty} highlight={highlight} />

         <form
            className="lab-panel grid gap-xs p-s md:grid-cols-[1fr_1fr_auto] md:items-end"
            onSubmit={(e) => {
               e.preventDefault();
               if (!from || !to) return;
               onAddWire(from, to);
               setTo("");
            }}
         >
            <div>
               <label htmlFor={fromId} className="mono-caps text-muted">
                  From port
               </label>
               <select id={fromId} className="lab-select mt-3xs" value={from} onChange={(e) => (setFrom(e.target.value), setTo(""))}>
                  <option value="">Choose a port…</option>
                  {byPart.map(([group, list]) => (
                     <optgroup key={group} label={group}>
                        {list.map((p) => (
                           <option key={p.value} value={p.value}>
                              {p.port.label} — {p.summary}
                           </option>
                        ))}
                     </optgroup>
                  ))}
               </select>
            </div>
            <div>
               <label htmlFor={toId} className="mono-caps text-muted">
                  To port
               </label>
               <select id={toId} className="lab-select mt-3xs" value={to} onChange={(e) => setTo(e.target.value)} disabled={!fromPort}>
                  <option value="">{fromPort ? "Choose a port…" : "Pick the first end"}</option>
                  {good.length > 0 && (
                     <optgroup label="Matching connectors">
                        {good.map((p) => (
                           <option key={p.value} value={p.value}>
                              {p.partName} · {p.port.label} — {p.summary}
                           </option>
                        ))}
                     </optgroup>
                  )}
                  {other.length > 0 && (
                     <optgroup label="Other ports (will be checked — may be a fault)">
                        {other.map((p) => (
                           <option key={p.value} value={p.value}>
                              {p.partName} · {p.port.label} — {p.summary}
                           </option>
                        ))}
                     </optgroup>
                  )}
               </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={!from || !to}>
               Connect
            </button>
            <p className="font-mono text-caption text-muted md:col-span-3">
               Any two ports can be connected — the checks will tell you what a wrong wire would do to the real hardware.
            </p>
         </form>

         <section aria-labelledby="wires-title">
            <h3 id="wires-title" className="mb-xs font-display text-lead font-semibold">
               Wires <span className="font-mono text-small text-muted">({build.wires.length})</span>
            </h3>
            {build.wires.length === 0 && <p className="text-muted">No wires yet.</p>}
            <ul className="flex flex-col gap-3xs">
               {build.wires.map((w) => {
                  const kind = wireKind(build, w);
                  const problems = (issuesByWire.get(w.id) ?? []).filter((i) => i.severity !== "info");
                  const worst = problems.some((i) => i.severity === "error") ? "error" : problems.length ? "warning" : null;
                  return (
                     <li
                        key={w.id}
                        className="lab-row flex flex-wrap items-center gap-xs border-b border-line py-2xs text-small"
                        data-highlight={highlight.has(w.from.uid) && highlight.has(w.to.uid) ? "" : undefined}
                     >
                        <span className="w-[4.5rem] font-mono text-caption text-muted">{kind}</span>
                        <span className="min-w-0 flex-1">
                           {label(w.from)} <span aria-label="to">→</span> {label(w.to)}
                           {problems.length > 0 && (
                              <span className="block font-mono text-caption text-warning">{problems.map((p) => p.title).join(" · ")}</span>
                           )}
                        </span>
                        {worst && (
                           <span className="lab-sev" data-sev={worst}>
                              {worst}
                           </span>
                        )}
                        <button
                           type="button"
                           className="lab-btn-sm"
                           onClick={() => onRemoveWire(w.id)}
                           aria-label={`Disconnect ${label(w.from)} from ${label(w.to)}`}
                        >
                           Disconnect
                        </button>
                     </li>
                  );
               })}
            </ul>
         </section>
      </div>
   );
}

