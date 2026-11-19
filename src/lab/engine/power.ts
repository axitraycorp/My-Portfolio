import type { Issue, PowerInPort, PowerNode, PowerOutPort } from "../model/types";
import { key, nodeName, type Graph, type Node } from "./graph";

export interface VRange {
   nominal: number;
   min: number;
   max: number;
}

/** Current drawn at one point: steady draw plus per-unit surges (stall/start-up) on top. */
interface Load {
   typ: number;
   units: number[];
}

const fmtV = (v: number) => `${Number(v.toFixed(2))} V`;
const fmtA = (a: number) => (a < 1 ? `${Math.round(a * 1000)} mA` : `${Number(a.toFixed(2))} A`);

/** Realistic peak: steady draw plus the largest fifth of surges (min. two) at once. */
export function peakOf(load: Load): number {
   const n = Math.max(2, Math.ceil(load.units.length * 0.2));
   const surges = [...load.units].sort((a, b) => b - a).slice(0, n);
   return load.typ + surges.reduce((s, u) => s + u, 0);
}

const scale = (load: Load, f: number): Load => ({ typ: load.typ * f, units: load.units.map((u) => u * f) });
const add = (a: Load, b: Load): Load => ({ typ: a.typ + b.typ, units: [...a.units, ...b.units] });
const times = (load: Load, n: number): Load => ({
   typ: load.typ * n,
   units: Array.from({ length: n }, () => load.units).flat(),
});
const ZERO: Load = { typ: 0, units: [] };

export interface PowerAnalysis {
   issues: Issue[];
   nodes: PowerNode[];
   /** Supply range seen by each connected power input, keyed `uid.port`. */
   inputRange: Map<string, VRange>;
   /** True if the part has power on the inputs it needs. */
   powered: Map<string, boolean>;
   avgPowerW: number;
   peakPowerW: number;
}

export function analysePower(g: Graph): PowerAnalysis {
   const issues: Issue[] = [];
   const outMemo = new Map<string, VRange | null>();
   const inputRange = new Map<string, VRange>();

   const inputs = (n: Node) => n.part.ports.filter((p): p is PowerInPort => p.kind === "power-in");

   // ── Voltages ────────────────────────────────────────────────────────────
   const visiting = new Set<string>();
   let loopReported = false;

   /** Which input actually feeds an output: its declared input if connected, else any connected input. */
   const feedingInput = (uid: string, out: PowerOutPort): PowerInPort | undefined => {
      const node = g.nodes.get(uid);
      if (!node || !out.from) return undefined;
      const declared = inputs(node).find((p) => p.id === out.from);
      if (declared && g.sourceOf.has(key(uid, declared.id))) return declared;
      return inputs(node).find((p) => g.sourceOf.has(key(uid, p.id)));
   };

   const rangeAtInput = (uid: string, portId: string): VRange | null => {
      const link = g.sourceOf.get(key(uid, portId));
      return link ? rangeAtOutput(link.src.uid, link.src.port) : null;
   };

   function rangeAtOutput(uid: string, out: PowerOutPort): VRange | null {
      const k = key(uid, out.id);
      if (outMemo.has(k)) return outMemo.get(k)!;
      if (!out.from) {
         const r = { nominal: out.voltage, min: out.vMin, max: out.vMax };
         outMemo.set(k, r);
         return r;
      }
      if (visiting.has(k)) {
         if (!loopReported) {
            loopReported = true;
            issues.push({
               id: "power-loop",
               severity: "error",
               category: "power",
               title: "Power loop",
               detail: "A part's output feeds back into its own supply through other parts. Every power path must start at a battery or supply.",
               uids: [uid],
            });
         }
         return null;
      }
      visiting.add(k);
      const feed = feedingInput(uid, out);
      const inRange = feed ? rangeAtInput(uid, feed.id) : null;
      visiting.delete(k);
      let r: VRange | null = null;
      if (inRange) {
         r =
            out.conversion === "passthrough"
               ? inRange
               : { nominal: out.voltage, min: out.voltage, max: out.voltage };
      }
      outMemo.set(k, r);
      return r;
   }

   for (const link of g.power) {
      const r = rangeAtOutput(link.src.uid, link.src.port);
      if (r) inputRange.set(key(link.sink.uid, link.sink.port.id), r);
   }

   // ── Powered state + missing supplies ────────────────────────────────────
   const powered = new Map<string, boolean>();
   for (const [uid, node] of g.nodes) {
      const ins = inputs(node);
      if (ins.length === 0) {
         powered.set(uid, true); // powered through its data cable (e.g. CSI camera) or passive
         continue;
      }
      const has = (p: PowerInPort) => inputRange.has(key(uid, p.id));
      const required = ins.filter((p) => p.required);
      const missing = required.filter((p) => !has(p));
      const anyOptional = ins.some((p) => !p.required && has(p));
      const ok = required.length > 0 ? missing.length === 0 : anyOptional;
      powered.set(uid, ok);
      if (!ok) {
         const list = required.length > 0 ? missing : ins;
         issues.push({
            id: `unpowered:${uid}`,
            severity: "error",
            category: "power",
            title: `${nodeName(node)} has no power`,
            detail:
               required.length > 0
                  ? `Connect ${list.map((p) => `"${p.label}" (${fmtV(p.vMin)}–${fmtV(p.vMax)})`).join(" and ")} to a suitable supply.`
                  : `Power it through one of: ${list.map((p) => `"${p.label}" (${fmtV(p.vMin)}–${fmtV(p.vMax)})`).join(", ")}.`,
            uids: [uid],
         });
      }
   }

   // ── Voltage compatibility on every power wire ───────────────────────────
   for (const link of g.power) {
      const r = inputRange.get(key(link.sink.uid, link.sink.port.id));
      if (!r) continue;
      const sinkNode = g.nodes.get(link.sink.uid)!;
      const srcNode = g.nodes.get(link.src.uid)!;
      const sink = link.sink.port;
      const base = {
         category: "power" as const,
         uids: [link.src.uid, link.sink.uid],
         wireIds: [link.wire.id],
      };
      const srcIsBattery = srcNode.part.category === "battery" || (r.min !== r.max && !link.src.port.from);
      if (r.max > sink.vMax + 1e-9) {
         issues.push({
            ...base,
            id: `overvoltage:${key(link.sink.uid, sink.id)}`,
            severity: "error",
            title: `Over-voltage: ${nodeName(sinkNode)} gets up to ${fmtV(r.max)}`,
            detail: `"${sink.label}" is rated ${fmtV(sink.vMin)}–${fmtV(sink.vMax)}, but ${nodeName(srcNode)} supplies ${
               r.min === r.max ? fmtV(r.max) : `${fmtV(r.min)}–${fmtV(r.max)}${srcIsBattery ? " (full charge)" : ""}`
            }. This can permanently damage it. Add a regulator that outputs a voltage inside its range.`,
         });
      } else if (r.max < sink.vMin) {
         issues.push({
            ...base,
            id: `undervoltage:${key(link.sink.uid, sink.id)}`,
            severity: "error",
            title: `Under-voltage: ${nodeName(sinkNode)} needs at least ${fmtV(sink.vMin)}`,
            detail: `${nodeName(srcNode)} only supplies ${fmtV(r.max)}. "${sink.label}" will not start. Use a higher-voltage source or a boost converter.`,
         });
      } else if (r.min < sink.vMin) {
         issues.push({
            ...base,
            id: `brownout:${key(link.sink.uid, sink.id)}`,
            severity: "warning",
            title: `${nodeName(sinkNode)} may brown out as the battery drains`,
            detail: `Supply drops to ${fmtV(r.min)} but "${sink.label}" needs ${fmtV(sink.vMin)}. It will reset or stop before the pack is empty — use a regulator with a lower input minimum or a higher-voltage pack.`,
         });
      }
   }

   // ── Currents ────────────────────────────────────────────────────────────
   const inputMemo = new Map<string, Load>();
   const outputMemo = new Map<string, Load>();
   const inputVisiting = new Set<string>();

   /** Total current drawn at a part's input (one unit), including what flows on to downstream parts. */
   function loadAtInput(uid: string, port: PowerInPort): Load {
      const k = key(uid, port.id);
      if (inputMemo.has(k)) return inputMemo.get(k)!;
      if (inputVisiting.has(k)) return ZERO;
      inputVisiting.add(k);
      const node = g.nodes.get(uid)!;
      const v = inputRange.get(k)?.nominal ?? (port.vMin + port.vMax) / 2;

      let own: Load;
      if (port.watts) {
         own = { typ: port.watts.typical / v, units: [(port.watts.peak - port.watts.typical) / v] };
      } else {
         own = { typ: port.typicalCurrent, units: [Math.max(0, port.peakCurrent - port.typicalCurrent)] };
      }

      // Downstream outputs fed from this input
      for (const out of node.part.ports) {
         if (out.kind !== "power-out") continue;
         if (feedingInput(uid, out)?.id !== port.id) continue;
         const downstream = loadAtOutput(uid, out);
         if (!downstream.typ && downstream.units.length === 0) continue;
         let converted = downstream;
         if (out.conversion === "switching") {
            const eff = out.efficiency ?? 0.85;
            converted = scale(downstream, out.voltage / (eff * v));
         }
         own = add(own, converted);
      }

      // Motors driven from this input
      for (const mp of node.part.ports) {
         if (mp.kind !== "motor" || mp.direction !== "out" || mp.supply !== port.id) continue;
         for (const ml of g.motor) {
            if (ml.driver.uid !== uid || ml.driver.port.id !== mp.id) continue;
            const motorNode = g.nodes.get(ml.motor.uid)!;
            const stall = ml.motor.port.current;
            // Running under load ≈ 30 % of stall; surge up to stall at start/stall.
            const perDriverUnit = times({ typ: stall * 0.3, units: [stall * 0.7] }, motorNode.inst.count);
            own = add(own, scale(perDriverUnit, 1 / node.inst.count));
         }
      }

      inputVisiting.delete(k);
      inputMemo.set(k, own);
      return own;
   }

   /** Current drawn from one output (summing every sink, each × its count). */
   function loadAtOutput(uid: string, out: PowerOutPort): Load {
      const k = key(uid, out.id);
      if (outputMemo.has(k)) return outputMemo.get(k)!;
      let total = ZERO;
      for (const link of g.power) {
         if (link.src.uid !== uid || link.src.port.id !== out.id) continue;
         const sinkNode = g.nodes.get(link.sink.uid)!;
         total = add(total, times(loadAtInput(link.sink.uid, link.sink.port), sinkNode.inst.count));
      }
      const sourceCount = g.nodes.get(uid)?.inst.count ?? 1;
      const perUnit = scale(total, 1 / sourceCount);
      outputMemo.set(k, perUnit);
      return perUnit;
   }

   // ── Capacity per output, linear-regulator heat, servo-on-logic-rail ─────
   const nodes: PowerNode[] = [];
   let avgPowerW = 0;
   let peakPowerW = 0;

   for (const [uid, node] of g.nodes) {
      for (const out of node.part.ports) {
         if (out.kind !== "power-out") continue;
         const used = g.power.some((l) => l.src.uid === uid && l.src.port.id === out.id);
         const range = rangeAtOutput(uid, out);
         if (!used || !range) continue;
         const load = loadAtOutput(uid, out);
         const typ = load.typ;
         const peak = peakOf(load);
         const isBattery = node.part.category === "battery";
         nodes.push({
            uid,
            portId: out.id,
            label: `${nodeName(node)} · ${out.label}`,
            voltage: range.nominal,
            maxCurrent: out.maxCurrent,
            typicalLoad: typ * node.inst.count,
            peakLoad: peak * node.inst.count,
         });
         if (!out.from) {
            avgPowerW += typ * range.nominal * node.inst.count;
            peakPowerW += peak * range.nominal * node.inst.count;
         }

         const base = { category: "power" as const, uids: [uid] };
         const what = isBattery
            ? `${nodeName(node)} can deliver ${fmtA(out.maxCurrent)} continuously (${node.part.battery?.cRating ?? "?"}C × ${node.part.battery?.capacityMah ?? "?"} mAh)`
            : `"${out.label}" on ${nodeName(node)} is rated ${fmtA(out.maxCurrent)}`;
         if (typ > out.maxCurrent) {
            issues.push({
               ...base,
               id: `overcurrent:${key(uid, out.id)}`,
               severity: "error",
               title: `Overloaded: ${nodeName(node)} (${fmtA(typ)} on a ${fmtA(out.maxCurrent)} output)`,
               detail: `${what}, but its loads draw ${fmtA(typ)} just running. Expect resets, sagging voltage or burnt parts. Use a bigger supply or split the loads across another regulator.`,
            });
         } else if (peak > out.maxCurrent) {
            issues.push({
               ...base,
               id: `peak-overcurrent:${key(uid, out.id)}`,
               severity: "warning",
               title: `Peak overload: ${nodeName(node)} (${fmtA(peak)} surges)`,
               detail: `${what}. Running draw is fine (${fmtA(typ)}), but motor/servo surges reach about ${fmtA(peak)}. Expect brownouts under hard moves — add headroom or a separate supply for the actuators.`,
            });
         }

         if (out.conversion === "linear") {
            const feed = feedingInput(uid, out);
            const vin = feed ? (inputRange.get(key(uid, feed.id))?.nominal ?? 0) : 0;
            const heat = Math.max(0, vin - out.voltage) * typ;
            if (heat > 0.8) {
               issues.push({
                  ...base,
                  id: `linear-heat:${key(uid, out.id)}`,
                  severity: heat > 2 ? "error" : "warning",
                  title: `${nodeName(node)}: linear regulator burns ${heat.toFixed(1)} W`,
                  detail: `"${out.label}" drops ${fmtV(vin)} to ${fmtV(out.voltage)} at ${fmtA(typ)}; the difference turns into heat. ${
                     heat > 2 ? "It will overheat and shut down." : "It will get very hot."
                  } Power those loads from a switching (buck) regulator instead.`,
               });
            }
         }
      }
   }

   for (const link of g.power) {
      const sinkNode = g.nodes.get(link.sink.uid)!;
      const srcNode = g.nodes.get(link.src.uid)!;
      const isActuator = sinkNode.part.category === "servo" || sinkNode.part.category === "motor";
      const fromLogic = srcNode.part.category === "controller" || srcNode.part.category === "compute";
      if (!isActuator || !fromLogic || link.src.port.actuatorRail) continue;
      const surge = Math.max(0, link.sink.port.peakCurrent) * sinkNode.inst.count;
      issues.push({
         id: `actuator-on-logic:${link.wire.id}`,
         severity: surge > 1 ? "error" : "warning",
         category: "power",
         title: `${nodeName(sinkNode)} powered from ${nodeName(srcNode)}`,
         detail: `Servos and motors draw big current spikes (${fmtA(surge)} here). Powering them from a controller's pin makes the controller reset or burns its regulator. Feed them from the battery through a servo BEC/regulator, sharing only ground and signal with the controller.`,
         uids: [link.src.uid, link.sink.uid],
         wireIds: [link.wire.id],
      });
   }

   const hasBattery = [...g.nodes.values()].some((n) => n.part.category === "battery");
   const hasProtection = [...g.nodes.values()].some((n) => n.part.category === "protection");
   if (hasBattery && !hasProtection) {
      issues.push({
         id: "no-fuse",
         severity: "info",
         category: "power",
         title: "No main switch or fuse",
         detail: "LiPo packs can deliver tens of amps into a short. Put a switch and fuse right after the battery.",
         uids: [],
      });
   }

   return { issues, nodes, inputRange, powered, avgPowerW, peakPowerW };
}
