import { ENVIRONMENTS } from "../engine/environments";
import type { EnvironmentResult } from "../model/types";

type Props = { results: EnvironmentResult[]; envId: string; onSelect: (id: string) => void };

export function TestsPanel({ results, envId, onSelect }: Props) {
   const env = ENVIRONMENTS.find((e) => e.id === envId) ?? ENVIRONMENTS[0];
   const result = results.find((r) => r.environmentId === env.id);
   const passed = results.filter((r) => r.verdict === "pass").length;

   return (
      <div className="flex flex-col gap-s">
         <div className="flex items-baseline justify-between gap-xs">
            <h2 className="font-display text-lead font-semibold">Test environments</h2>
            <span className="font-mono text-caption text-muted">
               {passed}/{results.length} pass
            </span>
         </div>
         <ul className="grid grid-cols-1 gap-3xs sm:grid-cols-2" aria-label="Environments">
            {ENVIRONMENTS.map((e) => {
               const r = results.find((x) => x.environmentId === e.id);
               return (
                  <li key={e.id}>
                     <button
                        type="button"
                        className="lab-row flex min-h-[2.75rem] w-full items-center justify-between gap-xs rounded-hud border border-line px-xs py-2xs text-left text-small hover:border-camera"
                        aria-pressed={e.id === env.id}
                        data-highlight={e.id === env.id ? "" : undefined}
                        onClick={() => onSelect(e.id)}
                     >
                        <span>{e.name}</span>
                        {r && (
                           <span className="lab-sev" data-sev={r.verdict}>
                              {r.verdict}
                           </span>
                        )}
                     </button>
                  </li>
               );
            })}
         </ul>

         <section className="lab-panel p-s" aria-live="polite" aria-labelledby="env-title">
            <h3 id="env-title" className="font-display text-body font-semibold">
               {env.name}
            </h3>
            <p className="mt-3xs text-small text-muted">{env.description}</p>
            <p className="mt-2xs font-mono text-caption text-muted">
               {env.ambientC} °C · {env.durationMin} min{env.slopeDeg ? ` · ${env.slopeDeg}° slope` : ""} · {env.terrain}
            </p>
            <ul className="mt-s flex flex-col gap-2xs">
               {result?.criteria.map((c) => (
                  <li key={c.label} className="flex items-start gap-xs text-small">
                     <span className="lab-sev mt-[0.15rem]" data-sev={c.verdict}>
                        {c.verdict}
                     </span>
                     <span>
                        <span className="font-medium">{c.label}</span> <span className="text-muted">— {c.detail}</span>
                     </span>
                  </li>
               ))}
            </ul>
         </section>
      </div>
   );
}
