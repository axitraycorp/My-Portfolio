import { getPart } from "../model/catalog";
import type { Build, Port, PortRef, Wire } from "../model/types";

export interface PortOption {
   ref: PortRef;
   value: string;
   port: Port;
   partName: string;
   /** Human summary, e.g. "I2C host · 3.3 V" or "power out · 5 V 3 A". */
   summary: string;
}

export const refValue = (r: PortRef) => `${r.uid}:${r.port}`;

export function parseRef(value: string): PortRef {
   const i = value.indexOf(":");
   return { uid: value.slice(0, i), port: value.slice(i + 1) };
}

export function portSummary(p: Port): string {
   switch (p.kind) {
      case "power-out":
         return `power out · ${p.voltage} V ${p.maxCurrent} A`;
      case "power-in":
         return p.watts
            ? `power in · ${p.vMin}–${p.vMax} V ${p.watts.typical}/${p.watts.peak} W`
            : `power in · ${p.vMin}–${p.vMax} V ${p.typicalCurrent}/${p.peakCurrent} A`;
      case "data":
         return `${p.protocol.toUpperCase()} ${p.role} · ${p.logic} V${p.capacity ? ` · ${p.capacity} slots` : ""}`;
      case "motor":
         return p.direction === "out"
            ? `motor out · ${p.voltage} V ${p.current} A${p.channels ? ` × ${p.channels} ch` : ""}`
            : `motor in · ${p.voltage} V stall ${p.current} A`;
   }
}

export function listPorts(build: Build): PortOption[] {
   const out: PortOption[] = [];
   for (const inst of build.parts) {
      const part = getPart(inst.partId);
      if (!part) continue;
      const name = inst.label || part.name;
      for (const port of part.ports) {
         const ref = { uid: inst.uid, port: port.id };
         out.push({ ref, value: refValue(ref), port, partName: name, summary: portSummary(port) });
      }
   }
   return out;
}

/** The connection a careful builder would make. Anything else is allowed but gets checked. */
export function isCompatible(a: Port, b: Port): boolean {
   if (a.kind === "power-out") return b.kind === "power-in";
   if (a.kind === "power-in") return b.kind === "power-out";
   if (a.kind === "motor") return b.kind === "motor" && a.direction !== b.direction;
   if (a.kind === "data") return b.kind === "data" && a.protocol === b.protocol && a.role !== b.role;
   return false;
}

export type WireKind = "power" | "data" | "motor" | "invalid";

export function wireKind(build: Build, wire: Wire): WireKind {
   const a = getPart(build.parts.find((p) => p.uid === wire.from.uid)?.partId ?? "")?.ports.find((p) => p.id === wire.from.port);
   const b = getPart(build.parts.find((p) => p.uid === wire.to.uid)?.partId ?? "")?.ports.find((p) => p.id === wire.to.port);
   if (!a || !b || !isCompatible(a, b)) return "invalid";
   return a.kind === "data" ? "data" : a.kind === "motor" ? "motor" : "power";
}

/** Next free id with a prefix, e.g. "u7" or "w31". */
export function nextId(prefix: string, taken: Iterable<string>): string {
   const used = new Set(taken);
   let n = 1;
   while (used.has(`${prefix}${n}`)) n++;
   return `${prefix}${n}`;
}
