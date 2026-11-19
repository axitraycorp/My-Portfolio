"use client";

import { useId, useMemo, useState } from "react";
import { CATEGORY_LABELS, CATEGORY_ORDER, PARTS, getPart } from "../model/catalog";
import type { Build, PartCategory, PartInstance } from "../model/types";
import { PartSpecs } from "./PartSpecs";

type Props = {
   build: Build;
   highlight: Set<string>;
   onAdd: (partId: string) => void;
   onRemove: (uid: string) => void;
   onChange: (uid: string, patch: Partial<PartInstance>) => void;
};

/** I²C devices whose address can be changed with a jumper: the default and the alternative. */
function i2cOptions(partId: string): number[] | null {
   const port = getPart(partId)?.ports.find((p) => p.kind === "data" && p.protocol === "i2c" && p.role === "device");
   if (!port || port.kind !== "data" || port.i2cAddress === undefined) return null;
   return [port.i2cAddress, port.i2cAddress + 1];
}

const hex = (n: number) => `0x${n.toString(16).padStart(2, "0")}`;

export function PartsPanel({ build, highlight, onAdd, onRemove, onChange }: Props) {
   const [category, setCategory] = useState<PartCategory | "all">("all");
   const [query, setQuery] = useState("");
   const searchId = useId();
   const catId = useId();

   const grouped = useMemo(
      () =>
         CATEGORY_ORDER.map((cat) => ({
            cat,
            items: build.parts.filter((p) => getPart(p.partId)?.category === cat),
         })).filter((g) => g.items.length > 0),
      [build.parts],
   );

   const catalog = useMemo(() => {
      const q = query.trim().toLowerCase();
      return PARTS.filter(
         (p) =>
            (category === "all" || p.category === category) &&
            (!q || `${p.name} ${p.description} ${p.tags?.join(" ") ?? ""}`.toLowerCase().includes(q)),
      );
   }, [category, query]);

   return (
      <div className="grid gap-l lg:grid-cols-[1.1fr_1fr]">
         <section aria-labelledby="installed-title" className="flex flex-col gap-s">
            <h3 id="installed-title" className="font-display text-lead font-semibold">
               Installed parts <span className="font-mono text-small text-muted">({build.parts.length})</span>
            </h3>
            {grouped.length === 0 && <p className="text-muted">No parts yet. Add a frame, a brain and a power source.</p>}
            {grouped.map(({ cat, items }) => (
               <div key={cat}>
                  <p className="mono-caps mb-2xs text-muted">{CATEGORY_LABELS[cat]}</p>
                  <ul className="flex flex-col gap-2xs">
                     {items.map((inst) => {
                        const part = getPart(inst.partId)!;
                        const addresses = i2cOptions(inst.partId);
                        return (
                           <li
                              key={inst.uid}
                              className="lab-row lab-panel p-xs"
                              data-highlight={highlight.has(inst.uid) ? "" : undefined}
                           >
                              <div className="flex flex-wrap items-center gap-xs">
                                 <span className="font-mono text-caption text-muted">[{inst.uid}]</span>
                                 <span className="min-w-0 flex-1 font-medium">{part.name}</span>
                                 <div className="flex items-center gap-3xs" role="group" aria-label={`Quantity of ${part.name}`}>
                                    <button
                                       type="button"
                                       className="lab-btn-sm"
                                       aria-label="One fewer"
                                       disabled={inst.count <= 1}
                                       onClick={() => onChange(inst.uid, { count: inst.count - 1 })}
                                    >
                                       −
                                    </button>
                                    <span className="w-[3ch] text-center font-mono text-small" aria-live="polite">
                                       {inst.count}
                                    </span>
                                    <button
                                       type="button"
                                       className="lab-btn-sm"
                                       aria-label="One more"
                                       disabled={inst.count >= 24}
                                       onClick={() => onChange(inst.uid, { count: inst.count + 1 })}
                                    >
                                       +
                                    </button>
                                 </div>
                                 <button
                                    type="button"
                                    className="lab-btn-sm"
                                    onClick={() => onRemove(inst.uid)}
                                    aria-label={`Remove ${part.name} and its wires`}
                                 >
                                    Remove
                                 </button>
                              </div>
                              {addresses && (
                                 <label className="mt-2xs flex items-center gap-xs font-mono text-caption text-muted">
                                    I²C address
                                    <select
                                       className="lab-select w-auto"
                                       value={inst.i2cAddress ?? addresses[0]}
                                       onChange={(e) => {
                                          const v = Number(e.target.value);
                                          onChange(inst.uid, { i2cAddress: v === addresses[0] ? undefined : v });
                                       }}
                                    >
                                       {addresses.map((a, i) => (
                                          <option key={a} value={a}>
                                             {hex(a)} {i === 0 ? "(default)" : "(jumper)"}
                                          </option>
                                       ))}
                                    </select>
                                 </label>
                              )}
                              <details className="mt-2xs">
                                 <summary className="cursor-pointer font-mono text-caption text-camera">Specs</summary>
                                 <div className="pt-xs">
                                    <PartSpecs part={part} />
                                 </div>
                              </details>
                           </li>
                        );
                     })}
                  </ul>
               </div>
            ))}
         </section>

         <section aria-labelledby="catalog-title" className="flex flex-col gap-s">
            <h3 id="catalog-title" className="font-display text-lead font-semibold">
               Parts catalogue <span className="font-mono text-small text-muted">({PARTS.length})</span>
            </h3>
            <div className="grid gap-xs sm:grid-cols-2">
               <div>
                  <label htmlFor={catId} className="mono-caps text-muted">
                     Category
                  </label>
                  <select
                     id={catId}
                     className="lab-select mt-3xs"
                     value={category}
                     onChange={(e) => setCategory(e.target.value as PartCategory | "all")}
                  >
                     <option value="all">All categories</option>
                     {CATEGORY_ORDER.map((c) => (
                        <option key={c} value={c}>
                           {CATEGORY_LABELS[c]}
                        </option>
                     ))}
                  </select>
               </div>
               <div>
                  <label htmlFor={searchId} className="mono-caps text-muted">
                     Search
                  </label>
                  <input
                     id={searchId}
                     type="search"
                     className="lab-input mt-3xs"
                     placeholder="e.g. Jetson, 12 V, LiDAR"
                     value={query}
                     onChange={(e) => setQuery(e.target.value)}
                  />
               </div>
            </div>
            <ul className="flex max-h-[34rem] flex-col gap-2xs overflow-y-auto pr-3xs" aria-live="polite">
               {catalog.length === 0 && <li className="text-muted">No parts match.</li>}
               {catalog.map((part) => (
                  <li key={part.id} className="lab-panel p-xs">
                     <div className="flex items-start gap-xs">
                        <div className="min-w-0 flex-1">
                           <p className="font-medium">{part.name}</p>
                           <p className="font-mono text-caption text-muted">
                              {CATEGORY_LABELS[part.category]} · {part.massG} g · ≈ ${part.priceUsd}
                           </p>
                        </div>
                        <button type="button" className="lab-btn-sm" onClick={() => onAdd(part.id)} aria-label={`Add ${part.name}`}>
                           + Add
                        </button>
                     </div>
                     <details className="mt-2xs">
                        <summary className="cursor-pointer font-mono text-caption text-camera">Specs</summary>
                        <div className="pt-xs">
                           <PartSpecs part={part} />
                        </div>
                     </details>
                  </li>
               ))}
            </ul>
         </section>
      </div>
   );
}
