import type { Metric } from "@/content/profile";
import { MetricValue } from "./MetricValue";

/** Metrics table. Rows have ids `metric-<id>` so the assistant can point at them. */
export function ResultsTable({ metrics, caption }: { metrics: Metric[]; caption: string }) {
   return (
      <div className="results">
         <table id="metrics-table" className="results__table">
            <caption className="sr-only">{caption}</caption>
            <thead>
               <tr>
                  <th scope="col">Metric</th>
                  <th scope="col">Baseline</th>
                  <th scope="col">Optimised</th>
                  <th scope="col">Milestone</th>
               </tr>
            </thead>
            <tbody>
               {metrics.map((m) => (
                  <tr key={m.id} id={`metric-${m.id}`} className="results__row">
                     <th scope="row" data-label="Metric">
                        <span className="block font-medium text-ink">{m.label}</span>
                        <span className="font-mono text-caption text-muted">
                           {m.unit} · {m.higherIsBetter ? "higher is better" : "lower is better"}
                        </span>
                     </th>
                     <td data-label={`Baseline · ${m.baselineLabel}`}>
                        <span className="results__sub">{m.baselineLabel}</span>
                        <MetricValue value={m.baseline} unit={m.unit} precision={m.precision} />
                     </td>
                     <td data-label={`Optimised · ${m.optimisedLabel}`}>
                        <span className="results__sub">{m.optimisedLabel}</span>
                        <MetricValue value={m.optimised} unit={m.unit} precision={m.precision} />
                     </td>
                     <td data-label="Milestone">
                        <a
                           href={`/#milestone-${m.milestone}`}
                           className="link font-mono text-small"
                        >
                           M{m.milestone}
                        </a>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
}
