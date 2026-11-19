import type { Build, BuildStats, CheckReport, Issue, Severity } from "../model/types";
import { getArchetype } from "../model/archetypes";
import { buildGraph, nodeName, type Graph } from "./graph";
import { analysePower, type PowerAnalysis } from "./power";
import { checkSignals } from "./signals";
import { checkComputeWiring, checkThermal, summariseCompute, type ComputeSummary } from "./compute";
import { buildMechanics, checkMechanics, type MechanicsModel } from "./mechanical";

export interface Analysis {
   graph: Graph;
   power: PowerAnalysis;
   compute: ComputeSummary;
   mechanics: MechanicsModel;
   report: CheckReport;
}

const ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

function checkCompleteness(build: Build, g: Graph, compute: ComputeSummary): Issue[] {
   const issues: Issue[] = [];
   const all = [...g.nodes.values()];
   const frames = all.filter((n) => n.part.frame);
   if (frames.length === 0) {
      issues.push({
         id: "no-frame",
         severity: "error",
         category: "completeness",
         title: "No frame or chassis",
         detail: "Pick a frame — it defines how the robot moves and how many motors/servos it needs.",
         uids: [],
      });
   } else if (frames.length > 1 || frames[0].inst.count > 1) {
      issues.push({
         id: "multiple-frames",
         severity: "error",
         category: "completeness",
         title: "More than one frame",
         detail: "A robot has a single chassis. Remove the extra frames.",
         uids: frames.map((f) => f.inst.uid),
      });
   } else {
      const expected = getArchetype(build.archetype)?.frameId;
      if (expected && frames[0].part.id !== expected && frames[0].part.frame?.archetype !== build.archetype) {
         issues.push({
            id: "frame-archetype",
            severity: "warning",
            category: "completeness",
            title: `${nodeName(frames[0])} doesn't match this robot type`,
            detail: "The 3D model and tests use the robot type you picked; swap to its matching frame.",
            uids: [frames[0].inst.uid],
         });
      }
   }
   if (!all.some((n) => n.part.category === "battery")) {
      issues.push({
         id: "no-power-source",
         severity: "error",
         category: "completeness",
         title: "No power source",
         detail: "Add a battery (or a bench supply for tethered testing).",
         uids: [],
      });
   }
   if (!compute.main) {
      issues.push({
         id: "no-brain",
         severity: "error",
         category: "completeness",
         title: "No controller or computer",
         detail: "Add a microcontroller for real-time control and/or a Linux computer for vision and navigation.",
         uids: [],
      });
   }
   return issues;
}

function dedupe(issues: Issue[]): Issue[] {
   const seen = new Set<string>();
   return issues.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}

/** Runs every check on a build. Pure and deterministic — safe on server and client. */
export function analyse(build: Build): Analysis {
   const graph = buildGraph(build);
   const power = analysePower(graph);
   const compute = summariseCompute(graph, power);
   const mechanics = buildMechanics(graph, power);

   const issues = dedupe([
      ...graph.issues,
      ...checkCompleteness(build, graph, compute),
      ...power.issues,
      ...checkSignals(graph, power),
      ...checkComputeWiring(graph),
      ...checkThermal(compute),
      ...checkMechanics(graph, mechanics),
   ]).sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);

   const all = [...graph.nodes.values()];
   const batteries = all.filter((n) => n.part.battery);
   const tethered = batteries.some((n) => n.part.battery?.tethered);
   const batteryWh = batteries.reduce(
      (s, n) =>
         s + n.part.battery!.nominalV * (n.part.battery!.capacityMah / 1000) * n.inst.count,
      0,
   );
   // 85 % usable energy (cutoff, conversion losses not already counted)
   const runtimeMin =
      tethered || batteryWh === 0 || power.avgPowerW <= 0
         ? null
         : ((batteryWh * 0.85) / power.avgPowerW) * 60;

   const stats: BuildStats = {
      massG: Math.round(mechanics.massKg * 1000),
      priceUsd: all.reduce((s, n) => s + n.part.priceUsd * n.inst.count, 0),
      batteryWh,
      avgPowerW: power.avgPowerW,
      peakPowerW: power.peakPowerW,
      runtimeMin,
      computeTops: compute.tops,
      powerNodes: power.nodes,
   };

   const counts = { error: 0, warning: 0, info: 0 } as Record<Severity, number>;
   for (const i of issues) counts[i.severity]++;

   return {
      graph,
      power,
      compute,
      mechanics,
      report: { issues, stats, counts, ok: counts.error === 0 },
   };
}

export function runChecks(build: Build): CheckReport {
   return analyse(build).report;
}
