import type { Analysis } from "../engine";
import { getArchetype, templateFor } from "../model/archetypes";
import { PARTS, getPart } from "../model/catalog";
import type { ArchetypeId, Build, Issue, Part, PartCategory, Port, PortRef } from "../model/types";

/*
 * The lab guide: works out where a build stands and what to do next, using the
 * robot type's reference design as the recommendation and the simulator's
 * checks as the judge. Pure, so it runs in the browser on every change.
 */

export type GuideStageId =
   | "frame"
   | "brain"
   | "power"
   | "regulation"
   | "drivers"
   | "actuators"
   | "cameras"
   | "sensors"
   | "cooling"
   | "wiring"
   | "checks"
   | "assemble"
   | "done";

export type GuideTab = "issues" | "parts" | "wiring" | "plan" | "power";

export interface PartSuggestion {
   partId: string;
   count: number;
   reason: string;
   recommended: boolean;
}

export interface WireSuggestion {
   from: PortRef;
   to: PortRef;
   text: string;
}

export interface GuideStep {
   stage: GuideStageId;
   title: string;
   say: string;
   tab?: GuideTab;
   highlight: string[];
   parts: PartSuggestion[];
   wires: WireSuggestion[];
   /** The step can be skipped (optional parts). */
   optional: boolean;
   issue?: Issue;
}

export interface GuideState {
   stages: { id: GuideStageId; title: string; done: boolean }[];
   current: GuideStep;
}

const TITLES: Record<GuideStageId, string> = {
   frame: "Frame",
   brain: "Brain",
   power: "Battery & switch",
   regulation: "Regulators",
   drivers: "Drivers",
   actuators: "Motors & servos",
   cameras: "Cameras",
   sensors: "Sensors",
   cooling: "Cooling",
   wiring: "Wiring",
   checks: "Fix the checks",
   assemble: "Assembly plan",
   done: "Ready",
};

const ORDER: GuideStageId[] = ["frame", "brain", "power", "regulation", "drivers", "actuators", "cameras", "sensors", "cooling", "wiring", "checks", "assemble", "done"];

const STAGE_CATEGORIES: Partial<Record<GuideStageId, PartCategory[]>> = {
   frame: ["frame"],
   brain: ["controller", "compute"],
   power: ["battery", "protection"],
   regulation: ["regulator"],
   drivers: ["motor-driver", "servo-driver"],
   cameras: ["camera"],
   sensors: ["sensor"],
   cooling: ["cooling"],
};

const OPTIONAL: GuideStageId[] = ["regulation", "drivers", "cameras", "sensors", "cooling"];

const partsIn = (build: Build, cats: PartCategory[]) =>
   build.parts.filter((p) => {
      const c = getPart(p.partId)?.category;
      return c !== undefined && cats.includes(c);
   });

const has = (build: Build, cat: PartCategory) => partsIn(build, [cat]).length > 0;

/** Can the brain parts already drive motors / servos without a separate driver? */
function brainDrives(build: Build, what: "motor" | "servo", need: number): boolean {
   for (const inst of build.parts) {
      const part = getPart(inst.partId);
      if (!part || part.category === "motor-driver" || part.category === "servo-driver") continue;
      for (const p of part.ports) {
         if (what === "motor" && p.kind === "motor" && p.direction === "out" && (p.channels ?? 1) >= need) return true;
         if (what === "servo" && p.kind === "data" && p.role === "host" && p.protocol === "bus-servo") return true;
      }
   }
   return false;
}

function suggestFor(build: Build, cats: PartCategory[], reasonFor: (p: Part) => string): PartSuggestion[] {
   const template = templateFor(build.archetype);
   const recommended = template.parts.filter((p) => cats.includes(getPart(p.partId)!.category));
   const out: PartSuggestion[] = recommended
      .filter((r) => !build.parts.some((p) => p.partId === r.partId))
      .map((r) => ({ partId: r.partId, count: r.count, reason: reasonFor(getPart(r.partId)!), recommended: true }));
   const alts = PARTS.filter((p) => cats.includes(p.category) && !recommended.some((r) => r.partId === p.id) && !build.parts.some((b) => b.partId === p.id));
   for (const p of alts.slice(0, Math.max(0, 4 - out.length))) out.push({ partId: p.id, count: 1, reason: reasonFor(p), recommended: false });
   return out;
}

/** A new build with only the frame: the starting point for building from scratch. */
export function scratchBuild(archetype: ArchetypeId): Build {
   const a = getArchetype(archetype)!;
   return { name: `My ${a.name.toLowerCase()}`, archetype, parts: [{ uid: "frame", partId: a.frameId, count: 1 }], wires: [] };
}

// ─── Wiring suggestions ─────────────────────────────────────────────────────

const key = (r: PortRef) => `${r.uid}.${r.port}`;

function portLabel(build: Build, r: PortRef): string {
   const inst = build.parts.find((p) => p.uid === r.uid);
   const part = inst ? getPart(inst.partId) : undefined;
   const port = part?.ports.find((p) => p.id === r.port);
   return `${part?.name ?? r.uid} · ${port?.label ?? r.port}`;
}

/** Next wires to make: the reference design's wiring mapped onto the user's parts, then any obviously free required ports. */
export function suggestWires(build: Build, limit = 6): WireSuggestion[] {
   const out: WireSuggestion[] = [];
   const existing = new Set(build.wires.flatMap((w) => [`${key(w.from)}>${key(w.to)}`, `${key(w.to)}>${key(w.from)}`]));
   const used = new Set(build.wires.flatMap((w) => [key(w.from), key(w.to)]));
   const push = (from: PortRef, to: PortRef) => {
      if (existing.has(`${key(from)}>${key(to)}`)) return;
      existing.add(`${key(from)}>${key(to)}`);
      existing.add(`${key(to)}>${key(from)}`);
      used.add(key(from));
      used.add(key(to));
      out.push({ from, to, text: `${portLabel(build, from)} → ${portLabel(build, to)}` });
   };

   // 1. Reference wiring for parts the user has in common with the reference design
   const template = templateFor(build.archetype);
   const uidFor = (templateUid: string) => {
      const partId = template.parts.find((p) => p.uid === templateUid)?.partId;
      return build.parts.find((p) => p.partId === partId)?.uid;
   };
   for (const w of template.wires) {
      const f = uidFor(w.from.uid);
      const t = uidFor(w.to.uid);
      if (f && t) push({ uid: f, port: w.from.port }, { uid: t, port: w.to.port });
   }

   // 2. Required power inputs with nothing on them: nearest output whose voltage fits
   const outs: { ref: PortRef; port: Extract<Port, { kind: "power-out" }> }[] = [];
   for (const inst of build.parts) for (const p of getPart(inst.partId)?.ports ?? []) if (p.kind === "power-out") outs.push({ ref: { uid: inst.uid, port: p.id }, port: p });
   for (const inst of build.parts) {
      const part = getPart(inst.partId);
      if (!part) continue;
      const ins = part.ports.filter((p) => p.kind === "power-in");
      if (ins.length === 0 || ins.some((p) => used.has(key({ uid: inst.uid, port: p.id })))) continue;
      const target = ins.find((p) => p.required) ?? ins[0];
      if (target.kind !== "power-in") continue;
      // Actuators prefer actuator rails, logic prefers logic rails; then the closest voltage
      const actuator = part.category === "servo" || part.category === "motor";
      const mid = (target.vMin + target.vMax) / 2;
      const score = (o: (typeof outs)[number]) => (Boolean(o.port.actuatorRail) === actuator ? 0 : 100) + Math.abs(o.port.voltage - mid);
      const src = outs
         .filter((o) => o.ref.uid !== inst.uid && o.port.vMin >= target.vMin && o.port.vMax <= target.vMax)
         .sort((x, y) => score(x) - score(y))[0];
      if (src) push(src.ref, { uid: inst.uid, port: target.id });
   }

   // 3. Devices with no host, motors with no driver
   const hosts: { ref: PortRef; port: Extract<Port, { kind: "data" }> }[] = [];
   const drivers: PortRef[] = [];
   for (const inst of build.parts) {
      for (const p of getPart(inst.partId)?.ports ?? []) {
         if (p.kind === "data" && p.role === "host") hosts.push({ ref: { uid: inst.uid, port: p.id }, port: p });
         if (p.kind === "motor" && p.direction === "out") drivers.push({ uid: inst.uid, port: p.id });
      }
   }
   for (const inst of build.parts) {
      const part = getPart(inst.partId);
      for (const p of part?.ports ?? []) {
         const ref = { uid: inst.uid, port: p.id };
         if (used.has(key(ref))) continue;
         if (p.kind === "data" && p.role === "device" && part?.category !== "motor") {
            const h = hosts.find((x) => x.ref.uid !== inst.uid && x.port.protocol === p.protocol);
            if (h) push(ref, h.ref);
         } else if (p.kind === "motor" && p.direction === "in" && drivers[0]) {
            push(drivers[0], ref);
         }
      }
   }
   return out.slice(0, limit);
}

// ─── State ──────────────────────────────────────────────────────────────────

export function guideState(build: Build, a: Analysis, opts: { skipped: Set<GuideStageId>; planSeen: boolean }): GuideState {
   const frame = partsIn(build, ["frame"])[0];
   const spec = frame ? getPart(frame.partId)?.frame : undefined;
   const template = templateFor(build.archetype);
   const templateHas = (cat: PartCategory) => template.parts.some((p) => getPart(p.partId)?.category === cat);
   const count = (cat: PartCategory) => partsIn(build, [cat]).reduce((n, p) => n + p.count, 0);

   const needsMotorDriver = (spec?.motors ?? 0) > 0 && !brainDrives(build, "motor", spec?.motors ?? 0);
   const servoBus = template.parts.some((p) => getPart(p.partId)?.servo?.control === "bus");
   const needsServoDriver = (spec?.servos ?? 0) > 1 && !(servoBus && brainDrives(build, "servo", 0)) && templateHas("servo-driver");
   const wires = suggestWires(build);
   const wiringErrors = a.report.issues.filter((i) => i.severity === "error" && (i.category === "wiring" || i.category === "power" || i.category === "logic-level" || i.category === "bus"));

   const done: Record<GuideStageId, boolean> = {
      frame: Boolean(frame),
      // Every kind of brain the reference design uses (the user can stop earlier)
      brain: (["controller", "compute"] as PartCategory[]).every((c) => has(build, c) || !templateHas(c)),
      power: has(build, "battery") && (!templateHas("protection") || has(build, "protection")),
      // Each rail the reference design regulates (skip if your parts need different ones)
      regulation: template.parts.filter((p) => getPart(p.partId)?.category === "regulator").every((r) => build.parts.some((p) => p.partId === r.partId)),
      drivers: (!needsMotorDriver || has(build, "motor-driver")) && (!needsServoDriver || has(build, "servo-driver")),
      actuators: count("motor") >= (spec?.motors ?? 0) && count("servo") >= (spec?.servos ?? 0),
      cameras: has(build, "camera"),
      sensors: has(build, "sensor"),
      cooling: !has(build, "compute") || has(build, "cooling"),
      wiring: build.wires.length > 0 && wires.length === 0,
      checks: a.report.counts.error === 0,
      assemble: opts.planSeen,
      done: false,
   };
   for (const s of opts.skipped) done[s] = true;

   const stages = ORDER.map((id) => ({ id, title: TITLES[id], done: done[id] }));
   const currentId = ORDER.find((id) => !done[id]) ?? "done";
   const step = describe(currentId, build, a, { spec, needsMotorDriver, needsServoDriver, wires, wiringErrors });
   return { stages, current: step };
}

function describe(
   stage: GuideStageId,
   build: Build,
   a: Analysis,
   ctx: {
      spec: Part["frame"];
      needsMotorDriver: boolean;
      needsServoDriver: boolean;
      wires: WireSuggestion[];
      wiringErrors: Issue[];
   },
): GuideStep {
   const anyBrain = partsIn(build, ["controller", "compute"]).length > 0;
   const base = {
      stage,
      title: TITLES[stage],
      highlight: [] as string[],
      parts: [] as PartSuggestion[],
      wires: [] as WireSuggestion[],
      optional: OPTIONAL.includes(stage) || (stage === "brain" && anyBrain),
   };
   const cats = STAGE_CATEGORIES[stage] ?? [];
   const uidsOf = (c: PartCategory[]) => partsIn(build, c).map((p) => p.uid);

   switch (stage) {
      case "frame":
         return {
            ...base,
            say: "Every robot starts with a frame: it decides how it moves, how many motors or joints it needs and how much deck space you get.",
            tab: "parts",
            parts: suggestFor(build, cats, (p) => `${p.frame?.motors ?? 0} motors · ${p.frame?.servos ?? 0} servo joints`),
         };
      case "brain":
         return {
            ...base,
            say: "Now the brain. A microcontroller runs motors and reads sensors in real time; a Linux computer runs ROS 2, cameras and AI. Many robots use both.",
            tab: "parts",
            highlight: uidsOf(["frame"]),
            parts: suggestFor(build, cats, (p) => (p.compute ? `${p.compute.tops ? `${p.compute.tops} TOPS · ` : ""}${p.compute.ram} · ${p.compute.loadWatts} W` : "real-time control, low power")),
         };
      case "power":
         return {
            ...base,
            say: "Power next: pick a battery that can feed the brain and the actuators at their peak, and always put a switch and fuse straight after it.",
            tab: "parts",
            parts: suggestFor(build, cats, (p) => (p.battery ? `${p.battery.nominalV} V · ${p.battery.capacityMah} mAh · ${p.battery.cRating} C` : "cuts power fast and stops a short from starting a fire")),
         };
      case "regulation":
         return {
            ...base,
            say: "Your boards need steady 5 V (or 19 V for a Jetson) — the battery's voltage sags and swings. A switching regulator converts it efficiently.",
            tab: "parts",
            highlight: uidsOf(["battery", "controller", "compute"]),
            parts: suggestFor(build, cats, (p) => `${p.ports.find((x) => x.kind === "power-out")?.label ?? ""}`),
         };
      case "drivers":
         return {
            ...base,
            say: ctx.needsMotorDriver
               ? "A logic pin can't power a motor — it would burn out. A motor driver switches battery current to the motors on the brain's command."
               : "Many servos need a controller: it generates every servo signal so the brain doesn't have to.",
            tab: "parts",
            highlight: uidsOf(["controller", "compute"]),
            parts: suggestFor(build, ctx.needsMotorDriver ? ["motor-driver"] : ["servo-driver"], (p) => p.description.split(".")[0]),
         };
      case "actuators": {
         const spec = ctx.spec;
         const motors = partsIn(build, ["motor"]).reduce((n, p) => n + p.count, 0);
         const servos = partsIn(build, ["servo"]).reduce((n, p) => n + p.count, 0);
         const needM = Math.max(0, (spec?.motors ?? 0) - motors);
         const needS = Math.max(0, (spec?.servos ?? 0) - servos);
         const sugg = suggestFor(build, needM > 0 ? ["motor"] : ["servo"], (p) =>
            p.motor ? `${p.motor.ratedRpm} rpm · ${p.motor.stallTorqueKgCm} kg·cm` : `${p.servo?.stallTorqueKgCm} kg·cm · ${p.servo?.control.toUpperCase()}`,
         ).map((s) => ({ ...s, count: needM > 0 ? needM : needS }));
         return {
            ...base,
            say: `The frame has ${spec?.motors ?? 0} motor mounts and ${spec?.servos ?? 0} joints — you still need ${needM ? `${needM} motor${needM > 1 ? "s" : ""}` : `${needS} servo${needS > 1 ? "s" : ""}`}. Pick the size the frame's brackets take; the outlines in the 3D view show the empty slots.`,
            tab: "parts",
            highlight: uidsOf(["frame"]),
            parts: sugg,
         };
      }
      case "cameras":
         return {
            ...base,
            say: "Eyes next. A depth camera sees shape and distance for grasping and mapping; a CSI camera is small and fast on a Pi; a USB webcam is the simplest. Cameras need a Linux computer to process the images.",
            tab: "parts",
            highlight: uidsOf(["compute"]),
            parts: suggestFor(build, cats, (p) => `${p.sensor?.provides.join(", ") ?? ""}${p.sensor?.needsLinuxHost ? " · needs Linux" : ""}`),
         };
      case "sensors":
         return {
            ...base,
            say: "Other senses: a LiDAR or ultrasonic to measure distance, an IMU to know which way is up, a microphone to hear commands.",
            tab: "parts",
            parts: suggestFor(build, cats, (p) => p.sensor?.provides.join(", ") ?? ""),
         };
      case "cooling":
         return {
            ...base,
            say: "Computers throttle when hot. Add cooling that can remove the computer's full-load heat — more in a 40 °C test.",
            tab: "parts",
            highlight: uidsOf(["compute"]),
            parts: suggestFor(build, cats, (p) => `removes ${p.cooling?.capacityWatts ?? 0} W`),
         };
      case "wiring": {
         const first = ctx.wires[0];
         return {
            ...base,
            say: first
               ? `Time to wire it. Each connection goes from one exact port to another — power first, then motors, then signals. Next: ${first.text}.`
               : "Connect power from the battery through the switch, then each board, then the signals.",
            tab: "wiring",
            highlight: first ? [first.from.uid, first.to.uid] : [],
            wires: ctx.wires,
         };
      }
      case "checks": {
         const issue = a.report.issues.find((i) => i.severity === "error")!;
         return {
            ...base,
            say: `It won't power up yet: ${issue.title}. ${issue.detail}`,
            tab: "issues",
            highlight: issue.uids,
            issue,
            wires: ctx.wires,
         };
      }
      case "assemble":
         return {
            ...base,
            say: "All checks pass. Open the assembly plan: it shows each step in 3D with the exact screws, then a five-stage power-on test to bring it up safely.",
            tab: "plan",
         };
      case "done":
         return {
            ...base,
            say:
               a.report.counts.warning > 0
                  ? `Built and wired. ${a.report.counts.warning} warning${a.report.counts.warning > 1 ? "s" : ""} left — worth a look. Try the test environments to see where it struggles.`
                  : "Built, wired and every check passes. Run it through the test environments — ramp, stairs, heatwave — to see where it struggles.",
         };
   }
}
