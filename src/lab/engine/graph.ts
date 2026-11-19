import { getPart } from "../model/catalog";
import type {
   Build,
   DataPort,
   Issue,
   MotorPort,
   Part,
   PartInstance,
   Port,
   PowerInPort,
   PowerOutPort,
   Wire,
} from "../model/types";

export interface Node {
   inst: PartInstance;
   part: Part;
}

export interface PowerLink {
   wire: Wire;
   src: { uid: string; port: PowerOutPort };
   sink: { uid: string; port: PowerInPort };
}

export interface DataLink {
   wire: Wire;
   host: { uid: string; port: DataPort };
   dev: { uid: string; port: DataPort };
}

export interface MotorLink {
   wire: Wire;
   driver: { uid: string; port: MotorPort };
   motor: { uid: string; port: MotorPort };
}

/** The build resolved against the catalog, with every wire classified. */
export interface Graph {
   nodes: Map<string, Node>;
   power: PowerLink[];
   data: DataLink[];
   motor: MotorLink[];
   /** sink key → link feeding it (first valid one). */
   sourceOf: Map<string, PowerLink>;
   issues: Issue[];
}

export const key = (uid: string, port: string) => `${uid}.${port}`;

export function nodeName(n: Node): string {
   const base = n.inst.label || n.part.name;
   return n.inst.count > 1 ? `${n.inst.count}× ${base}` : base;
}

function describe(kind: Port["kind"], port: Port): string {
   if (kind === "power-out") return "a power output";
   if (kind === "power-in") return "a power input";
   if (kind === "motor") return (port as MotorPort).direction === "out" ? "a motor output" : "motor terminals";
   return `a ${(port as DataPort).protocol.toUpperCase()} ${(port as DataPort).role} pin`;
}

export function buildGraph(build: Build): Graph {
   const nodes = new Map<string, Node>();
   const issues: Issue[] = [];

   for (const inst of build.parts) {
      const part = getPart(inst.partId);
      if (!part) {
         issues.push({
            id: `unknown-part:${inst.uid}`,
            severity: "error",
            category: "completeness",
            title: `Unknown part "${inst.partId}"`,
            detail: "This part is not in the catalog. Remove it from the build.",
            uids: [inst.uid],
         });
         continue;
      }
      nodes.set(inst.uid, { inst: { ...inst, count: Math.max(1, Math.floor(inst.count || 1)) }, part });
   }

   const power: PowerLink[] = [];
   const data: DataLink[] = [];
   const motor: MotorLink[] = [];
   const sourceOf = new Map<string, PowerLink>();
   const deviceHost = new Map<string, string>();
   const motorDriver = new Map<string, string>();

   const portOf = (uid: string, portId: string) => {
      const node = nodes.get(uid);
      return node ? { node, port: node.part.ports.find((p) => p.id === portId) } : undefined;
   };

   for (const wire of build.wires) {
      const a = portOf(wire.from.uid, wire.from.port);
      const b = portOf(wire.to.uid, wire.to.port);
      if (!a?.port || !b?.port || !a || !b) {
         issues.push({
            id: `dangling:${wire.id}`,
            severity: "error",
            category: "wiring",
            title: "Wire to a missing part or pin",
            detail: "One end of this wire points to a part or pin that no longer exists. Delete the wire.",
            uids: [wire.from.uid, wire.to.uid].filter((u) => nodes.has(u)),
            wireIds: [wire.id],
         });
         continue;
      }
      if (wire.from.uid === wire.to.uid) {
         issues.push({
            id: `self-loop:${wire.id}`,
            severity: "error",
            category: "wiring",
            title: `${nodeName(a.node)} is wired to itself`,
            detail: "A part's own pins should not be wired together. Delete this wire.",
            uids: [wire.from.uid],
            wireIds: [wire.id],
         });
         continue;
      }

      const ends = [
         { uid: wire.from.uid, port: a.port, node: a.node },
         { uid: wire.to.uid, port: b.port, node: b.node },
      ];
      const find = <T extends Port>(pred: (p: Port) => boolean) => ends.find((e) => pred(e.port)) as
         | { uid: string; port: T; node: Node }
         | undefined;

      const out = find<PowerOutPort>((p) => p.kind === "power-out");
      const inn = find<PowerInPort>((p) => p.kind === "power-in");
      const kinds = ends.map((e) => e.port.kind);
      const what = `${describe(a.port.kind, a.port)} (${nodeName(a.node)}) to ${describe(b.port.kind, b.port)} (${nodeName(b.node)})`;

      const bad = (id: string, title: string, detail: string) =>
         issues.push({
            id: `${id}:${wire.id}`,
            severity: "error",
            category: "wiring",
            title,
            detail,
            uids: [wire.from.uid, wire.to.uid],
            wireIds: [wire.id],
         });

      // ── Power ↔ power
      if (out && inn) {
         const sinkKey = key(inn.uid, inn.port.id);
         if (sourceOf.has(sinkKey)) {
            bad(
               "double-supply",
               `${nodeName(inn.node)} has two power sources`,
               `${inn.port.label} is already fed by another output. Tying two supplies together makes them fight each other — remove one of the wires.`,
            );
            continue;
         }
         const link: PowerLink = { wire, src: { uid: out.uid, port: out.port }, sink: { uid: inn.uid, port: inn.port } };
         power.push(link);
         sourceOf.set(sinkKey, link);
         continue;
      }
      if (kinds[0] === "power-out" && kinds[1] === "power-out") {
         bad(
            "shorted-outputs",
            "Two power outputs wired together",
            `You connected ${what}. Two outputs in parallel will fight (or short if their voltages differ). Each input should have exactly one source.`,
         );
         continue;
      }
      if (kinds[0] === "power-in" && kinds[1] === "power-in") {
         bad(
            "inputs-only",
            "Two power inputs wired together, no source",
            `You connected ${what}. Neither side supplies power. Connect each input to a battery, regulator or power output instead.`,
         );
         continue;
      }

      // ── Data ↔ data
      const dA = a.port.kind === "data" ? a.port : undefined;
      const dB = b.port.kind === "data" ? b.port : undefined;
      if (dA && dB) {
         if (dA.protocol !== dB.protocol) {
            bad(
               "protocol-mismatch",
               `Protocol mismatch: ${dA.protocol.toUpperCase()} ↔ ${dB.protocol.toUpperCase()}`,
               `You connected ${what}. These speak different protocols and cannot talk to each other. ${
                  dA.protocol === "bus-servo" || dB.protocol === "bus-servo"
                     ? "Smart bus servos need a servo-bus port (bus adapter or robot control board); PWM servos need PWM channels."
                     : "Pick a port with the matching protocol, or add an adapter."
               }`,
            );
            continue;
         }
         if (dA.role === dB.role) {
            bad(
               "role-mismatch",
               `Two ${dA.role}s connected`,
               `You connected ${what}. A ${dA.protocol.toUpperCase()} link needs one host (controller/computer) and one device.`,
            );
            continue;
         }
         const hostEnd = dA.role === "host" ? ends[0] : ends[1];
         const devEnd = dA.role === "host" ? ends[1] : ends[0];
         const devKey = key(devEnd.uid, devEnd.port.id);
         if (deviceHost.has(devKey)) {
            bad(
               "device-two-hosts",
               `${nodeName(devEnd.node)} is connected to two hosts`,
               `${(devEnd.port as DataPort).label} already connects to another controller. A device should have a single host.`,
            );
            continue;
         }
         deviceHost.set(devKey, hostEnd.uid);
         data.push({
            wire,
            host: { uid: hostEnd.uid, port: hostEnd.port as DataPort },
            dev: { uid: devEnd.uid, port: devEnd.port as DataPort },
         });
         continue;
      }

      // ── Motor ↔ motor
      const mA = a.port.kind === "motor" ? a.port : undefined;
      const mB = b.port.kind === "motor" ? b.port : undefined;
      if (mA && mB) {
         if (mA.direction === mB.direction) {
            bad(
               "motor-direction",
               mA.direction === "out" ? "Two motor outputs connected" : "Two motors wired to each other",
               `You connected ${what}. Motor terminals go to a driver's motor output.`,
            );
            continue;
         }
         const drvEnd = mA.direction === "out" ? ends[0] : ends[1];
         const motEnd = mA.direction === "out" ? ends[1] : ends[0];
         const motKey = key(motEnd.uid, motEnd.port.id);
         if (motorDriver.has(motKey)) {
            bad(
               "motor-two-drivers",
               `${nodeName(motEnd.node)} is wired to two drivers`,
               "Two H-bridges driving one motor will short through each other. Use one driver channel per motor.",
            );
            continue;
         }
         motorDriver.set(motKey, drvEnd.uid);
         motor.push({
            wire,
            driver: { uid: drvEnd.uid, port: drvEnd.port as MotorPort },
            motor: { uid: motEnd.uid, port: motEnd.port as MotorPort },
         });
         continue;
      }

      // ── Mixed kinds: the classic mistakes
      const motorEnd = ends.find((e) => e.port.kind === "motor");
      const dataEnd = ends.find((e) => e.port.kind === "data");
      if (motorEnd && dataEnd) {
         bad(
            "motor-on-pin",
            "Motor wired straight to a signal pin",
            `You connected ${what}. A pin supplies a few milliamps; a motor needs amps and creates voltage spikes. This destroys the pin. Drive motors through a motor driver.`,
         );
      } else if (motorEnd && (out || inn)) {
         bad(
            "motor-on-power",
            "Motor wired directly to a power pin",
            `You connected ${what}. Wired straight to power, the motor runs flat-out with no speed or direction control, and nothing limits its stall current. Use a motor driver between them.`,
         );
      } else if (dataEnd && out) {
         bad(
            "power-into-signal",
            "Power output wired into a signal pin",
            `You connected ${what}. Feeding supply voltage and current into a data pin will likely destroy it. Signal pins connect to signal pins; power goes to power inputs.`,
         );
      } else {
         bad(
            "incompatible",
            "Incompatible connection",
            `You connected ${what}. These pins are not meant to be joined.`,
         );
      }
   }

   return { nodes, power, data, motor, sourceOf, issues };
}
