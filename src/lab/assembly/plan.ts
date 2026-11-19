import { analyse, type Analysis } from "../engine";
import { getPart, getPort } from "../model/catalog";
import type { Build, Issue, PartCategory, TestVerdict } from "../model/types";
import type { Deck, Layout, Placement, StepId } from "./layout";

export interface HardwareLine {
   item: string;
   qty: number;
}

export interface PlanPart {
   uid: string;
   partId: string;
   count: number;
   where: string;
}

export interface PlanWire {
   id: string;
   from: string;
   to: string;
   kind: "power" | "data" | "motor" | "invalid";
   cable: string;
}

export interface PlanTest {
   verdict: TestVerdict;
   supply: string;
   measurements: string[];
   issues: Issue[];
}

export interface PlanStep {
   id: string;
   kind: "assembly" | "wiring" | "test";
   /** Which parts the 3D view shows: everything up to and including this stage. */
   stage: StepId;
   title: string;
   parts: PlanPart[];
   hardware: HardwareLine[];
   instructions: string[];
   wires?: PlanWire[];
   test?: PlanTest;
}

export interface Plan {
   steps: PlanStep[];
   /** Every screw, standoff, strap and bracket for the whole robot. */
   hardware: HardwareLine[];
}

// ─── Hardware ────────────────────────────────────────────────────────────────

function hardwareFor(p: Placement, kind: string | undefined): HardwareLine[] {
   const ph = p.phys;
   const n = ph.holes.length;
   const screw = ph.screw && ph.screwLengthMm ? `${ph.screw}×${ph.screwLengthMm} screw` : null;
   const out: HardwareLine[] = [];
   switch (ph.method) {
      case "standoffs":
      case "carrier":
      case "stack":
         if (ph.method === "carrier") out.push({ item: "Carrier / perfboard", qty: 1 });
         if (ph.standoffMm && ph.screw) out.push({ item: `${ph.screw}×${ph.standoffMm} standoff`, qty: n });
         if (screw) out.push({ item: screw, qty: ph.method === "stack" ? n : n * 2 });
         break;
      case "servo-tabs":
         if (screw) out.push({ item: screw, qty: n });
         if (ph.screw === "M3") out.push({ item: "M3 nylock nut", qty: n });
         out.push({ item: "Servo horn + centre screw", qty: 1 });
         break;
      case "bracket":
         if (p.part.category === "motor") {
            out.push({ item: `${ph.mountClass} motor bracket`, qty: 1 });
            if (screw) out.push({ item: screw, qty: n });
            out.push({ item: "M3×8 screw + nylock nut (bracket)", qty: 2 });
            if (kind === "rover" || kind === "mobile-arm" || kind === "car") {
               out.push({ item: "Wheel hub coupling", qty: 1 }, { item: "M3×4 grub screw", qty: 2 });
            }
         } else if (p.part.category === "servo") {
            if (screw) out.push({ item: screw, qty: n * 2 });
            out.push({ item: "Servo horn + centre screw", qty: 1 });
         } else {
            out.push({ item: "Mounting bracket", qty: 1 });
            if (screw) out.push({ item: screw, qty: n });
         }
         break;
      case "strap":
         out.push({ item: "20 mm hook-and-loop strap", qty: ph.sizeMm[0] > 140 ? 2 : 1 }, { item: "Foam pad", qty: 1 });
         break;
      case "holder":
         if (screw) out.push({ item: `${screw} (countersunk)`, qty: n });
         break;
      case "tape":
         out.push({ item: "Double-sided foam tape pad", qty: 1 }, { item: "Zip tie 100 mm", qty: 1 });
         break;
      case "panel":
         out.push({ item: "Inline blade-fuse holder", qty: 1 }, { item: "Zip tie 100 mm", qty: 2 });
         break;
      case "clip":
         out.push({ item: "Thermal pad (supplied)", qty: 1 });
         break;
      case "tripod":
         out.push({ item: "1/4\"-20 × 6 mm screw", qty: 1 }, { item: "L-bracket", qty: 1 }, { item: "M3×8 screw + nut", qty: 2 });
         break;
      case "off-board":
         out.push({ item: "XT60 tether lead, 2 m", qty: 1 });
         break;
   }
   return out;
}

function merge(lines: HardwareLine[]): HardwareLine[] {
   const map = new Map<string, number>();
   for (const l of lines) map.set(l.item, (map.get(l.item) ?? 0) + l.qty);
   return [...map.entries()].map(([item, qty]) => ({ item, qty })).sort((a, b) => a.item.localeCompare(b.item));
}

const deckHardware = (d: Deck): HardwareLine[] => [
   { item: `Deck plate ${d.level + 1}`, qty: 1 },
   { item: `M3×${d.standoffMm} hex standoff`, qty: 4 },
   { item: "M3×6 screw", qty: 8 },
];

// ─── Where things go ─────────────────────────────────────────────────────────

function whereOf(p: Placement, layout: Layout): string {
   const deckDesc = () => {
      const d = layout.decks.find((x) => x.level === p.level);
      if (!d) return "deck";
      const fx = p.pos[0] - d.offsetX;
      const fb = fx > d.size[0] / 6 ? "front" : fx < -d.size[0] / 6 ? "rear" : "middle";
      const lr = p.pos[2] < -d.size[1] / 6 ? "left" : p.pos[2] > d.size[1] / 6 ? "right" : "centre";
      return `deck ${d.level + 1}, ${fb} ${lr}${p.rotY ? ", turned 90°" : ""}`;
   };
   switch (p.zone) {
      case "bay":
         return p.rotY ? "battery bay, lying across" : "battery bay";
      case "ground":
         return "beside the robot (off-board)";
      case "front":
         return p.part.sensor?.type === "ultrasonic" ? "front bumper bracket" : "front sensor bracket";
      case "under":
         return "underneath, front";
      case "top":
         return `top of ${deckDesc()}`;
      case "stack": {
         const host = layout.placements.find(
            (h) => h.part.category === "compute" && Math.abs(h.pos[0] - p.pos[0]) < 1 && Math.abs(h.pos[2] - p.pos[2]) < 1,
         );
         return host ? `on top of the ${host.part.name}` : "stacked";
      }
      default:
         return deckDesc();
   }
}

function partsOf(units: Placement[], layout: Layout): PlanPart[] {
   const map = new Map<string, PlanPart>();
   for (const u of units) {
      const k = `${u.uid}|${whereOf(u, layout)}`;
      const cur = map.get(k);
      if (cur) cur.count++;
      else map.set(k, { uid: u.uid, partId: u.part.id, count: 1, where: whereOf(u, layout) });
   }
   return [...map.values()];
}

// ─── Wiring ──────────────────────────────────────────────────────────────────

function gauge(amps: number): string {
   if (amps <= 1) return "26 AWG";
   if (amps <= 3) return "22 AWG";
   if (amps <= 7) return "18 AWG";
   if (amps <= 15) return "16 AWG";
   if (amps <= 25) return "14 AWG";
   return "12 AWG";
}

function wiresOf(build: Build, a: Analysis): PlanWire[] {
   const label = (uid: string, port: string) => {
      const inst = build.parts.find((p) => p.uid === uid);
      const pt = inst ? getPort(inst.partId, port) : undefined;
      const part = inst ? getPart(inst.partId) : undefined;
      return `${part?.name ?? uid} · ${pt?.label ?? port}`;
   };
   return build.wires.map((w) => {
      const power = a.graph.power.find((l) => l.wire.id === w.id);
      const data = a.graph.data.find((l) => l.wire.id === w.id);
      const motor = a.graph.motor.find((l) => l.wire.id === w.id);
      let kind: PlanWire["kind"] = "invalid";
      let cable = "Not a valid connection — see the checks before wiring this.";
      if (power) {
         kind = "power";
         const node = a.report.stats.powerNodes.find((n) => n.uid === power.src.uid && n.portId === power.src.port.id);
         const amps = node ? node.peakLoad : power.sink.port.peakCurrent;
         const plug = amps > 5 ? "XT60" : amps > 2 ? "XT30 or 5.08 mm screw terminal" : "JST-XH or screw terminal";
         cable = `Red/black pair, ${gauge(amps)} (peak ≈ ${Math.round(amps * 10) / 10} A), ${plug}. Polarity: red to +.`;
      } else if (data) {
         kind = "data";
         const proto = data.host.port.protocol;
         cable = {
            i2c: "4-wire JST-SH/Dupont: VCC, GND, SDA, SCL. Keep under 30 cm.",
            uart: "3 wires: TX → RX, RX → TX, GND → GND (crossed).",
            spi: "6 wires: SCK, MOSI, MISO, CS, VCC, GND; short as possible.",
            usb: "USB cable, shortest that reaches; zip-tie strain relief at both ends.",
            csi: "Flat FFC ribbon (15→22-pin for Pi 5), contacts facing the right way; no sharp folds.",
            pwm: "3-pin servo lead or Dupont jumper; signal + GND.",
            gpio: "Dupont jumper(s) + shared GND.",
            "bus-servo": "3-pin bus-servo cable, daisy-chained along the limb.",
            pcie: "PCIe FFC ribbon supplied with the HAT.",
         }[proto];
      } else if (motor) {
         kind = "motor";
         cable = `2-wire ${gauge(motor.motor.port.current)} motor lead (+ 6-pin encoder cable if fitted); swap the pair if the wheel runs backwards.`;
      }
      return { id: w.id, from: label(w.from.uid, w.from.port), to: label(w.to.uid, w.to.port), kind, cable };
   });
}

// ─── Bring-up tests ──────────────────────────────────────────────────────────

const STAGES: { title: string; add: PartCategory[]; stage: StepId; how: string[] }[] = [
   {
      title: "Power test 1 — battery and switch only",
      add: ["battery", "protection"],
      stage: "power",
      how: [
         "Everything else unplugged. Fuse fitted, switch OFF: there must be no voltage after the switch.",
         "Switch ON: measure the battery voltage after the switch with a multimeter.",
      ],
   },
   {
      title: "Power test 2 — regulators, no loads",
      add: ["regulator"],
      stage: "regulation",
      how: [
         "Set and check every regulator output with nothing connected to it. Adjust trimmers before anything is plugged in.",
         "Switch off and let the capacitors discharge before the next stage.",
      ],
   },
   {
      title: "Power test 3 — brains",
      add: ["controller", "compute", "accelerator", "cooling"],
      stage: "brains",
      how: [
         "Use a current-limited bench supply if you have one. Power on: the board's power LED lights, the fan spins, the computer boots.",
         "Measure the logic rail at the board's 5 V / 3.3 V pins under load.",
      ],
   },
   {
      title: "Power test 4 — drivers and sensors",
      add: ["motor-driver", "servo-driver", "sensor"],
      stage: "sensors",
      how: [
         "Motors and servos still unplugged. Check each sensor answers (i2cdetect, lsusb, the LiDAR spins and streams).",
         "Driver logic LEDs on; driver outputs quiet with no command.",
      ],
   },
   {
      title: "Power test 5 — motors and servos",
      add: ["motor", "servo", "frame"],
      stage: "wiring",
      how: [
         "Robot on a stand, wheels/feet off the ground. Move one actuator at a time at low speed.",
         "Watch the rail voltages while everything moves: they must not dip below the boards' minimum.",
      ],
   },
];

function commissioning(build: Build): PlanStep[] {
   const cats = new Set<PartCategory>();
   let previous = new Set<string>();
   let prevNodes = new Set<string>();
   const battery = build.parts.map((p) => getPart(p.partId)).find((p) => p?.battery);
   const nominal = battery?.battery?.tethered ? 12 : (battery?.battery?.nominalV ?? 12);

   return STAGES.map((s, i) => {
      s.add.forEach((c) => cats.add(c));
      const final = i === STAGES.length - 1;
      const parts = build.parts.filter((p) => {
         const c = getPart(p.partId)?.category;
         return c !== undefined && cats.has(c);
      });
      const uids = new Set(parts.map((p) => p.uid));
      const sub: Build = { ...build, parts, wires: build.wires.filter((w) => uids.has(w.from.uid) && uids.has(w.to.uid)) };
      const a = analyse(sub);
      const relevant = a.report.issues.filter(
         (iss) => iss.severity !== "info" && (final || (iss.category !== "completeness" && iss.category !== "mechanical")),
      );
      const fresh = relevant.filter((iss) => !previous.has(iss.id));
      previous = new Set(relevant.map((iss) => iss.id));

      const measurements: string[] = [];
      for (const n of a.report.stats.powerNodes) {
         const k = `${n.uid}.${n.portId}`;
         if (prevNodes.has(k)) continue;
         const inst = build.parts.find((p) => p.uid === n.uid);
         const port = inst ? getPort(inst.partId, n.portId) : undefined;
         const range = port?.kind === "power-out" && port.vMax - port.vMin > 0.3 ? ` (${port.vMin}–${port.vMax} V)` : "";
         measurements.push(`${n.label} [${n.uid}]: ≈ ${n.voltage} V${range}; expected draw ${Math.round(n.typicalLoad * 100) / 100} A`);
      }
      prevNodes = new Set(a.report.stats.powerNodes.map((n) => `${n.uid}.${n.portId}`));

      const limit = Math.max(0.3, Math.round(((a.report.stats.peakPowerW / nominal) * 1.25) * 10) / 10);
      const supply =
         i === 0
            ? `Battery only. Expect ${nominal} V nominal.`
            : final
              ? `Battery (or a bench supply that can deliver ${limit} A at ${nominal} V).`
              : `Bench supply at ${nominal} V with the current limit at ${limit} A — a short trips the limit instead of burning a trace.`;

      const added = build.parts.some((p) => {
         const c = getPart(p.partId)?.category;
         return c !== undefined && s.add.includes(c);
      });
      if (!added) {
         return {
            id: `test-${i + 1}`,
            kind: "test" as const,
            stage: s.stage,
            title: s.title,
            parts: [],
            hardware: [],
            instructions: ["Nothing is added at this stage in this build — move on to the next test."],
            test: { verdict: "pass" as TestVerdict, supply: "—", measurements: [], issues: [] },
         };
      }
      const errors = fresh.filter((x) => x.severity === "error").length;
      const verdict: TestVerdict = errors ? "fail" : fresh.length ? "warn" : "pass";
      return {
         id: `test-${i + 1}`,
         kind: "test" as const,
         stage: s.stage,
         title: s.title,
         parts: [],
         hardware: [],
         instructions: [
            ...s.how,
            verdict === "fail" ? "STOP: fix the problems below before adding the next stage." : "Passes: carry on to the next stage.",
         ],
         test: { verdict, supply, measurements, issues: fresh },
      };
   });
}

// ─── Plan ────────────────────────────────────────────────────────────────────

const ASSEMBLY: { stage: StepId; title: string; intro: string }[] = [
   { stage: "actuators", title: "Motors, servos and wheels", intro: "Centre every servo (1500 µs, or position 500 on bus servos) before fitting its horn." },
   { stage: "power", title: "Battery and power switch", intro: "Keep the battery unplugged until power test 1." },
   { stage: "regulation", title: "Regulators", intro: "Mount regulators close to what they feed and away from the IMU." },
   { stage: "brains", title: "Controller, computer and cooling", intro: "Use nylon or brass standoffs; never let a board touch a metal deck." },
   { stage: "drivers", title: "Motor drivers and servo controllers", intro: "Put drivers next to the motors they drive to keep high-current leads short." },
   { stage: "sensors", title: "Sensors", intro: "Mount sensors last so nothing knocks them while you work." },
];

export function buildPlan(build: Build, a: Analysis = analyse(build)): Plan {
   const layout = a.layout;
   const geo = layout.geometry;
   const steps: PlanStep[] = [];
   const kind = geo?.kind;
   const frameInst = build.parts.find((p) => getPart(p.partId)?.category === "frame");

   if (geo && frameInst) {
      steps.push({
         id: "frame",
         kind: "assembly",
         stage: "frame",
         title: "Frame",
         parts: [{ uid: frameInst.uid, partId: frameInst.partId, count: 1, where: "base" }],
         hardware: geo.hardware,
         instructions: [...geo.steps, `Deck 1 usable area: ${geo.deck.size[0]} × ${geo.deck.size[1]} mm.`],
      });
   }

   const all = [...layout.placements, ...layout.motors.filter((m): m is Placement => m !== null)];
   const servos = layout.servos.filter((s): s is Placement => s !== null);
   for (const step of ASSEMBLY) {
      const units = [...all, ...(step.stage === "actuators" ? servos : [])].filter((u) => u.step === step.stage);
      const decks = layout.decks.filter((d) => d.level > 0 && d.step === step.stage);
      if (units.length === 0 && decks.length === 0) continue;

      const instructions = [step.intro];
      for (const d of decks) {
         instructions.push(`Fit deck ${d.level + 1}: 4× M3×${d.standoffMm} hex standoffs on top of deck ${d.level}'s corners, then the plate with 4× M3×6.`);
      }
      const seen = new Set<string>();
      for (const u of units) {
         if (seen.has(u.part.id)) continue;
         seen.add(u.part.id);
         instructions.push(`${u.part.name}: ${u.phys.mounting}`);
      }
      if (step.stage === "actuators" && geo) {
         layout.servos.forEach((s, i) => {
            if (!s) instructions.push(`Joint "${geo.jointLabels[i]}" has no servo — the build is short of servos.`);
         });
         layout.motors.forEach((m, i) => {
            if (!m) instructions.push(`Motor position ${i + 1} is empty — add another motor.`);
         });
      }

      const jointed = new Set<Placement>([...servos, ...layout.motors.filter((m): m is Placement => m !== null)]);
      const parts = partsOf(
         units.filter((u) => !jointed.has(u)),
         layout,
      );
      if (step.stage === "actuators" && geo) {
         layout.motors.forEach((m, i) => {
            if (!m) return;
            const pos = `${m.pos[0] > 0 ? "front" : "rear"} ${m.pos[2] < 0 ? "left" : m.pos[2] > 0 ? "right" : "centre"}`;
            parts.push({ uid: m.uid, partId: m.part.id, count: 1, where: `motor ${i + 1}, ${pos}` });
         });
         const byUid = new Map<string, string[]>();
         layout.servos.forEach((sv, i) => sv && byUid.set(sv.uid, [...(byUid.get(sv.uid) ?? []), geo.jointLabels[i]]));
         for (const [uid, joints] of byUid) {
            const inst = build.parts.find((p) => p.uid === uid)!;
            parts.push({ uid, partId: inst.partId, count: joints.length, where: joints.join(", ") });
         }
      }

      steps.push({
         id: step.stage,
         kind: "assembly",
         stage: step.stage,
         title: step.title,
         parts,
         hardware: merge([...units.flatMap((u) => hardwareFor(u, kind)), ...decks.flatMap(deckHardware)]),
         instructions,
      });
   }

   const wires = wiresOf(build, a);
   steps.push({
      id: "wiring",
      kind: "wiring",
      stage: "wiring",
      title: "Wiring",
      parts: [],
      hardware: merge([
         { item: "Zip tie 100 mm", qty: Math.max(4, Math.ceil(build.wires.length / 2)) },
         { item: "Heat-shrink tube (assorted)", qty: 1 },
      ]),
      instructions: [
         "Battery unplugged. Wire in this order: power, then motors, then signals.",
         "Every connection shares a common ground with the board it talks to.",
         "Route power and motor leads away from signal and I²C wires; twist motor pairs.",
      ],
      wires,
   });

   steps.push(...commissioning(build));

   const total = merge([
      ...(geo ? geo.hardware : []),
      ...[...all, ...servos].flatMap((u) => hardwareFor(u, kind)),
      ...layout.decks.filter((d) => d.level > 0).flatMap(deckHardware),
   ]);
   return { steps, hardware: total };
}

