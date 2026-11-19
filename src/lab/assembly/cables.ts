import type { Analysis } from "../engine";
import type { Build, DataProtocol } from "../model/types";
import type { Layout, Placement } from "./layout";

export type CableKind = "power" | "motor" | DataProtocol | "invalid";

export interface CableEnd {
   /** Placement key, e.g. "legs#3". */
   key: string;
   uid: string;
   port: string;
}

/** One physical cable in the 3D view. A build wire becomes several when it serves several units. */
export interface Cable {
   id: string;
   wireId: string;
   kind: CableKind;
   a: CableEnd;
   b: CableEnd;
   /** Part of a wire with an error or warning. */
   fault: "error" | "warning" | null;
}

const MAX_PER_WIRE = 24;

/** Every rendered unit of a part, in unit order. */
function unitsOf(layout: Layout, uid: string): Placement[] {
   const all = [...layout.placements, ...layout.motors, ...layout.servos].filter((p): p is Placement => p !== null && p.uid === uid);
   return all.sort((x, y) => x.unit - y.unit);
}

export function cablesFor(build: Build, a: Analysis): Cable[] {
   const layout = a.layout;
   const faults = new Map<string, "error" | "warning">();
   for (const i of a.report.issues) {
      if (i.severity === "info") continue;
      for (const w of i.wireIds ?? []) if (faults.get(w) !== "error") faults.set(w, i.severity);
   }

   const cables: Cable[] = [];
   for (const w of build.wires) {
      const from = unitsOf(layout, w.from.uid);
      const to = unitsOf(layout, w.to.uid);
      if (from.length === 0 || to.length === 0) continue;

      let kind: CableKind = "invalid";
      if (a.graph.power.some((l) => l.wire.id === w.id)) kind = "power";
      else if (a.graph.motor.some((l) => l.wire.id === w.id)) kind = "motor";
      else {
         const d = a.graph.data.find((l) => l.wire.id === w.id);
         if (d) kind = d.host.port.protocol;
      }

      const end = (p: Placement, port: string): CableEnd => ({ key: p.key, uid: p.uid, port });
      const pairs: [CableEnd, CableEnd][] = [];
      // Bus servos are daisy-chained: each host drives its own contiguous chain (host → servo → servo …)
      const busFrom = from.length > 1 && from[0].part.servo?.control === "bus";
      const busTo = to.length > 1 && to[0].part.servo?.control === "bus";
      if (busFrom !== busTo) {
         const [chain, hosts, chainPort, hostPort] = busFrom ? [from, to, w.from.port, w.to.port] : [to, from, w.to.port, w.from.port];
         const per = Math.ceil(chain.length / hosts.length);
         hosts.forEach((h, k) => {
            const run = chain.slice(k * per, (k + 1) * per);
            if (run.length === 0) return;
            pairs.push([end(h, hostPort), end(run[0], chainPort)]);
            for (let i = 1; i < run.length; i++) pairs.push([end(run[i - 1], chainPort), end(run[i], chainPort)]);
         });
      } else if (from.length === 1) {
         to.forEach((u) => pairs.push([end(from[0], w.from.port), end(u, w.to.port)]));
      } else if (to.length === 1) {
         from.forEach((u) => pairs.push([end(u, w.from.port), end(to[0], w.to.port)]));
      } else {
         for (let i = 0; i < Math.min(from.length, to.length); i++) pairs.push([end(from[i], w.from.port), end(to[i], w.to.port)]);
      }

      pairs.slice(0, MAX_PER_WIRE).forEach(([x, y], i) =>
         cables.push({ id: `${w.id}:${i}`, wireId: w.id, kind, a: x, b: y, fault: faults.get(w.id) ?? null }),
      );
   }
   return cables;
}

/** Port keys ("uid.port") that have a wire, for colouring connectors. */
export function connectedPorts(build: Build): Set<string> {
   const s = new Set<string>();
   for (const w of build.wires) {
      s.add(`${w.from.uid}.${w.from.port}`);
      s.add(`${w.to.uid}.${w.to.port}`);
   }
   return s;
}
