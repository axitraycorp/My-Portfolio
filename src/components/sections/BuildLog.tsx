import { getMetric, milestones } from "@/content/profile";
import { StatusPill } from "@/components/hud/StatusPill";
import { TopicLabel } from "@/components/hud/TopicLabel";

export function BuildLog() {
   const done = milestones.filter((m) => m.status === "done").length;
   return (
      <section id="build-log" aria-labelledby="build-log-title" className="section">
         <div className="section__inner">
            <TopicLabel topic="/robot/build_log" channel="camera" className="section__eyebrow" />
            <h2 id="build-log-title" className="section__title">
               Build log
            </h2>
            <p className="section__lead">
               Six milestones, built in the open. {done} of {milestones.length} complete — each one
               ships with deliverables and a number to prove it.
            </p>

            <div id="timeline" className="timeline mt-xl">
               <span className="timeline__track" aria-hidden="true">
                  <span className="timeline__line" />
               </span>
               <ol className="timeline__list-root">
                  {milestones.map((m) => (
                     <li
                        key={m.number}
                        id={`milestone-${m.number}`}
                        className="timeline__item"
                        data-status={m.status}
                     >
                        <span className="timeline__marker" aria-hidden="true">
                           {m.number}
                        </span>
                        <details className="timeline__card" open={m.status === "active"}>
                           <summary className="timeline__summary">
                              <span className="flex flex-wrap items-center gap-xs">
                                 <span className="mono-caps">Milestone {m.number}</span>
                                 <StatusPill status={m.status} />
                              </span>
                              <span className="mt-2xs block font-display text-h3 font-medium">
                                 {m.title}
                              </span>
                              <span className="mt-3xs block text-muted">{m.description}</span>
                           </summary>
                           <div className="timeline__details">
                              <div>
                                 <h4 className="mono-caps mb-2xs">Deliverables</h4>
                                 <ul className="timeline__list">
                                    {m.deliverables.map((d) => (
                                       <li key={d}>{d}</li>
                                    ))}
                                 </ul>
                              </div>
                              {m.metrics.length > 0 && (
                                 <div>
                                    <h4 className="mono-caps mb-2xs">Metrics</h4>
                                    <ul className="timeline__list">
                                       {m.metrics.map((id) => {
                                          const metric = getMetric(id);
                                          if (!metric) return null;
                                          const value = metric.optimised;
                                          return (
                                             <li
                                                key={id}
                                                className="flex flex-wrap justify-between gap-xs"
                                             >
                                                <span>{metric.label}</span>
                                                <span className="font-mono text-small text-muted">
                                                   {value === "measuring"
                                                      ? "measuring"
                                                      : `${value.toFixed(metric.precision)} ${metric.unit}`}
                                                </span>
                                             </li>
                                          );
                                       })}
                                    </ul>
                                 </div>
                              )}
                           </div>
                        </details>
                     </li>
                  ))}
               </ol>
            </div>
         </div>
      </section>
   );
}
