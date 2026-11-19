import { getArchetype } from "../model/archetypes";
import type { Build } from "../model/types";
import { analyse } from ".";
import { ENVIRONMENTS, runEnvironment } from "./environments";

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Plain-text description of a build and the simulator's own findings, for the
 * AI advisor. Computed on the server from the submitted build, never trusted from the client.
 */
export function buildBrief(build: Build): string {
   const a = analyse(build);
   const { stats, issues } = a.report;
   const lines: string[] = [];
   const arche = getArchetype(build.archetype);

   lines.push(`BUILD: "${build.name}" — robot type: ${arche?.name ?? build.archetype}`);
   lines.push("", "PARTS:");
   for (const n of a.graph.nodes.values()) {
      const p = n.part;
      const extra: string[] = [];
      if (p.compute) extra.push(`${p.compute.cpu}; GPU ${p.compute.gpu ?? "none"}; ${p.compute.ram}; ${p.compute.tops} TOPS; ${p.compute.loadWatts} W load`);
      if (p.battery) extra.push(`${p.battery.chemistry} ${p.battery.nominalV} V ${p.battery.capacityMah} mAh`);
      lines.push(`- [${n.inst.uid}] ${n.inst.count}× ${p.name} (${p.category})${extra.length ? ` — ${extra.join("; ")}` : ""}`);
   }

   lines.push("", "WIRES:");
   for (const w of build.wires) lines.push(`- ${w.from.uid}.${w.from.port} → ${w.to.uid}.${w.to.port}`);

   lines.push(
      "",
      "STATS:",
      `mass ${r1(stats.massG / 1000)} kg; parts cost ≈ $${Math.round(stats.priceUsd)}; battery ${r1(stats.batteryWh)} Wh; ` +
         `avg ${r1(stats.avgPowerW)} W; peak ${r1(stats.peakPowerW)} W; runtime ${stats.runtimeMin === null ? "n/a (tethered or no battery)" : `${Math.round(stats.runtimeMin)} min`}; ` +
         `AI compute ${stats.computeTops} TOPS; cooling ${r1(a.compute.coolingW)} W vs ${r1(a.compute.loadWatts)} W heat`,
   );
   lines.push("POWER RAILS:");
   for (const p of stats.powerNodes) {
      lines.push(`- ${p.label}: ${p.voltage} V, typical ${r1(p.typicalLoad)} A / peak ${r1(p.peakLoad)} A of ${p.maxCurrent} A`);
   }

   lines.push("", `SIMULATOR ISSUES (${issues.length}):`);
   if (issues.length === 0) lines.push("- none");
   for (const i of issues) lines.push(`- ${i.severity.toUpperCase()} [${i.category}] ${i.title}: ${i.detail}`);

   lines.push("", "ENVIRONMENT TESTS:");
   for (const env of ENVIRONMENTS) {
      const res = runEnvironment(a, env);
      const notable = res.criteria.filter((c) => c.verdict !== "pass").map((c) => `${c.label}: ${c.detail}`);
      lines.push(`- ${env.name}: ${res.verdict.toUpperCase()}${notable.length ? ` (${notable.join("; ")})` : ""}`);
   }

   return lines.join("\n");
}
