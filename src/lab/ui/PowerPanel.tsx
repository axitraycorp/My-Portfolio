import type { ComputeSummary } from "../engine/compute";
import type { BuildStats } from "../model/types";

const r1 = (n: number) => Math.round(n * 10) / 10;

type Props = { stats: BuildStats; compute: ComputeSummary };

export function PowerPanel({ stats, compute }: Props) {
   const tiles: [string, string][] = [
      ["Mass", `${r1(stats.massG / 1000)} kg`],
      ["Parts cost", `≈ $${Math.round(stats.priceUsd)}`],
      ["Battery", stats.batteryWh > 0 ? `${r1(stats.batteryWh)} Wh` : "—"],
      ["Average draw", `${r1(stats.avgPowerW)} W`],
      ["Peak draw", `${r1(stats.peakPowerW)} W`],
      ["Runtime", stats.runtimeMin === null ? "tethered / none" : `${Math.round(stats.runtimeMin)} min`],
      ["AI compute", `${stats.computeTops} TOPS`],
      ["Cooling vs heat", `${r1(compute.coolingW)} / ${r1(compute.loadWatts)} W`],
   ];

   return (
      <div className="flex flex-col gap-l">
         <dl className="grid grid-cols-2 gap-xs sm:grid-cols-4">
            {tiles.map(([k, v]) => (
               <div key={k} className="lab-panel p-xs">
                  <dt className="mono-caps text-muted">{k}</dt>
                  <dd className="font-mono text-lead">{v}</dd>
               </div>
            ))}
         </dl>

         <section aria-labelledby="rails-title">
            <h3 id="rails-title" className="mb-2xs font-display text-lead font-semibold">
               Power rails
            </h3>
            <p className="mb-s text-small text-muted">
               Current drawn from each supply output: solid = typical, outline = realistic peak (largest surges together), against the
               output&apos;s rating.
            </p>
            {stats.powerNodes.length === 0 && <p className="text-muted">No powered rails yet — wire a battery or supply.</p>}
            <ul className="flex flex-col gap-s">
               {stats.powerNodes.map((n) => {
                  const typ = n.maxCurrent > 0 ? n.typicalLoad / n.maxCurrent : 0;
                  const peak = n.maxCurrent > 0 ? n.peakLoad / n.maxCurrent : 0;
                  const state = typ > 1 ? "error" : peak > 1 ? "warning" : "ok";
                  const colour = state === "error" ? "var(--warning)" : state === "warning" ? "var(--lidar)" : "var(--success)";
                  return (
                     <li key={`${n.uid}.${n.portId}`}>
                        <div className="mb-3xs flex flex-wrap items-baseline justify-between gap-xs text-small">
                           <span>
                              {n.label} <span className="font-mono text-caption text-muted">[{n.uid}] · {n.voltage} V</span>
                           </span>
                           <span className="font-mono text-caption">
                              {r1(n.typicalLoad)} A typ · {r1(n.peakLoad)} A peak / {n.maxCurrent} A
                           </span>
                        </div>
                        <div
                           className="lab-bar"
                           role="meter"
                           aria-label={`${n.label} load`}
                           aria-valuemin={0}
                           aria-valuemax={n.maxCurrent}
                           aria-valuenow={r1(n.typicalLoad)}
                           aria-valuetext={`${r1(n.typicalLoad)} amps typical, ${r1(n.peakLoad)} peak, of ${n.maxCurrent}`}
                        >
                           <span style={{ width: `${Math.min(100, peak * 100)}%`, boxShadow: `inset 0 0 0 1px ${colour}` }} />
                           <span style={{ width: `${Math.min(100, typ * 100)}%`, background: colour }} />
                        </div>
                     </li>
                  );
               })}
            </ul>
         </section>
      </div>
   );
}
