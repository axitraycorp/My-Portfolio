import type { CheckReport, Issue, Severity } from "../model/types";

const HEADINGS: Record<Severity, string> = {
   error: "Errors — the robot won't work, or parts get damaged",
   warning: "Warnings — works, but unreliable or out of spec",
   info: "Notes",
};

type Props = { report: CheckReport; onShow: (issue: Issue) => void; activeId: string | null };

export function IssuesPanel({ report, onShow, activeId }: Props) {
   if (report.issues.length === 0) {
      return (
         <p className="lab-panel flex items-center gap-xs p-s">
            <span className="lab-sev" data-sev="ok">
               all clear
            </span>
            Every electrical, signal, thermal and mechanical check passes.
         </p>
      );
   }
   return (
      <div className="flex flex-col gap-l">
         {(["error", "warning", "info"] as Severity[]).map((sev) => {
            const list = report.issues.filter((i) => i.severity === sev);
            if (list.length === 0) return null;
            return (
               <section key={sev} aria-label={HEADINGS[sev]}>
                  <h3 className="mb-xs flex items-center gap-xs font-display text-body font-semibold">
                     <span className="lab-sev" data-sev={sev}>
                        {list.length} {sev}
                        {list.length > 1 && sev !== "info" ? "s" : ""}
                     </span>
                     <span className="text-muted">{HEADINGS[sev].split(" — ")[1] ?? ""}</span>
                  </h3>
                  <ul className="flex flex-col gap-2xs">
                     {list.map((issue) => (
                        <li key={issue.id} className="lab-row lab-panel p-s" data-highlight={activeId === issue.id ? "" : undefined}>
                           <div className="flex flex-wrap items-baseline gap-xs">
                              <p className="flex-1 font-medium">{issue.title}</p>
                              <span className="font-mono text-caption text-muted">{issue.category}</span>
                           </div>
                           <p className="mt-3xs text-small text-muted">{issue.detail}</p>
                           {issue.uids.length > 0 && (
                              <button
                                 type="button"
                                 className="lab-btn-sm mt-xs"
                                 aria-pressed={activeId === issue.id}
                                 onClick={() => onShow(issue)}
                              >
                                 {activeId === issue.id ? "Highlighted" : "Highlight parts"} ({issue.uids.join(", ")})
                              </button>
                           )}
                        </li>
                     ))}
                  </ul>
               </section>
            );
         })}
      </div>
   );
}
