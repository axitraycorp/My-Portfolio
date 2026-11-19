import type { Issue } from "../model/types";
import { nodeName, type Graph, type Node } from "./graph";
import type { PowerAnalysis } from "./power";

/** Heat a bare board sheds with no heatsink (W). */
const BARE_BOARD_W = 3;

export interface ComputeSummary {
   main?: Node;
   tops: number;
   cpuScore: number;
   ramGB: number;
   runsLinux: boolean;
   wifi: boolean;
   /** Heat produced at full load (W): computer + accelerators. */
   loadWatts: number;
   throttleC: number;
   /** Cooling capacity at 25 °C (W). */
   coolingW: number;
}

export function summariseCompute(g: Graph, power: PowerAnalysis): ComputeSummary {
   const all = [...g.nodes.values()];
   const computers = all.filter((n) => n.part.category === "compute" && n.part.compute);
   const controllers = all.filter((n) => n.part.category === "controller" && n.part.compute);
   const main =
      computers.sort((a, b) => b.part.compute!.loadWatts - a.part.compute!.loadWatts)[0] ??
      controllers.sort((a, b) => b.part.compute!.cpuScore - a.part.compute!.cpuScore)[0];

   if (!main?.part.compute) {
      return {
         tops: 0,
         cpuScore: 0,
         ramGB: 0,
         runsLinux: false,
         wifi: false,
         loadWatts: 0,
         throttleC: 85,
         coolingW: BARE_BOARD_W,
      };
   }

   // Accelerators connected to the main computer
   const accels = g.data
      .filter((l) => l.host.uid === main.inst.uid && g.nodes.get(l.dev.uid)?.part.category === "accelerator")
      .map((l) => g.nodes.get(l.dev.uid)!)
      .filter((n) => power.powered.get(n.inst.uid));
   const c = main.part.compute;

   // Cooling: fans only count fully if powered
   let coolingW = 0;
   for (const n of all) {
      if (!n.part.cooling) continue;
      const hasFan = n.part.ports.some((p) => p.kind === "power-in");
      const factor = hasFan && !power.powered.get(n.inst.uid) ? 0.4 : 1;
      coolingW += n.part.cooling.capacityWatts * factor * n.inst.count;
   }
   if (coolingW === 0) coolingW = BARE_BOARD_W;

   return {
      main,
      tops: c.tops + accels.reduce((s, a) => s + (a.part.compute?.tops ?? 0) * a.inst.count, 0),
      cpuScore: c.cpuScore,
      ramGB: c.ramGB,
      runsLinux: c.runsLinux,
      wifi: c.wifi,
      loadWatts: c.loadWatts + accels.reduce((s, a) => s + (a.part.compute?.loadWatts ?? 0), 0),
      throttleC: c.throttleC,
      coolingW,
   };
}

/** Cooling capacity at an ambient temperature: shrinks as ambient approaches the throttle point. */
export function coolingAt(summary: ComputeSummary, ambientC: number): number {
   const span = summary.throttleC - 25;
   if (span <= 0) return summary.coolingW;
   return Math.max(0, (summary.coolingW * (summary.throttleC - ambientC)) / span);
}

export function checkThermal(summary: ComputeSummary): Issue[] {
   const { main } = summary;
   if (!main || summary.loadWatts <= BARE_BOARD_W) return [];
   const cap = coolingAt(summary, 25);
   if (summary.loadWatts <= cap) return [];
   return [
      {
         id: `thermal:${main.inst.uid}`,
         severity: "warning",
         category: "thermal",
         title: `${nodeName(main)} will throttle under load`,
         detail: `It produces about ${summary.loadWatts} W at full load but your cooling removes only ~${cap.toFixed(
            0,
         )} W at 25 °C. It will slow down (and AI frame rates drop) once it reaches ${summary.throttleC} °C. Add an active cooler or fan heatsink.`,
         uids: [main.inst.uid],
      },
   ];
}

export function checkComputeWiring(g: Graph): Issue[] {
   const issues: Issue[] = [];
   for (const [uid, node] of g.nodes) {
      if (node.part.category !== "accelerator") continue;
      const onHost = g.data.some((l) => l.dev.uid === uid);
      if (!onHost) {
         issues.push({
            id: `accel-unmounted:${uid}`,
            severity: "error",
            category: "compute",
            title: `${nodeName(node)} isn't attached to a computer`,
            detail: "Connect its PCIe port to the computer's PCIe slot.",
            uids: [uid],
         });
      }
   }
   return issues;
}
