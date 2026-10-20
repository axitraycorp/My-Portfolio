import { metrics } from "@/content/profile";
import { TopicLabel } from "@/components/hud/TopicLabel";
import { ResultsTable } from "./ResultsTable";

export function Results() {
   const measured = metrics.filter((m) => m.optimised !== "measuring").length;
   return (
      <section id="results" aria-labelledby="results-title" className="section">
         <div className="section__inner">
            <TopicLabel topic="/robot/diagnostics" channel="radar" className="section__eyebrow" />
            <h2 id="results-title" className="section__title">
               Results
            </h2>
            <p className="section__lead">
               Every claim gets a number.{" "}
               {measured === 0
                  ? "Nothing is measured yet"
                  : `${measured} of ${metrics.length} measured`}{" "}
               — values appear here as each milestone lands, never before.
            </p>
            <div className="mt-xl">
               <ResultsTable
                  metrics={metrics}
                  caption="Robot performance metrics: baseline versus optimised, by milestone"
               />
            </div>
         </div>
      </section>
   );
}
