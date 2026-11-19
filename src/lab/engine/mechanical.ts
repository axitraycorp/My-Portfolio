import type { FrameSpec, Issue } from "../model/types";
import { key, nodeName, type Graph, type Node } from "./graph";
import type { PowerAnalysis } from "./power";

const G = 9.81;
/** N·m → kg·cm */
const toKgCm = (nm: number) => (nm * 100) / G;

export interface MechanicsModel {
   frame?: Node;
   spec?: FrameSpec;
   massKg: number;
   motorCount: number;
   servoCount: number;
   /** Usable continuous torque per drive motor (kg·cm), weakest motor. */
   motorTorqueKgCm: number;
   /** Usable torque of the strongest / weakest servo (kg·cm), at their actual supply voltage. */
   servoStrongKgCm: number;
   servoWeakKgCm: number;
   servoMassKg: number;
}

export function buildMechanics(g: Graph, power: PowerAnalysis): MechanicsModel {
   const all = [...g.nodes.values()];
   const frames = all.filter((n) => n.part.frame);
   const frame = frames[0];
   const massKg = all.reduce((s, n) => s + (n.part.massG * n.inst.count) / 1000, 0);

   // Drive motors: usable torque = stall × voltage ratio × 50 % (don't live near stall)
   let motorTorque = Infinity;
   let motorCount = 0;
   for (const l of g.motor) {
      const mot = g.nodes.get(l.motor.uid)!;
      const spec = mot.part.motor;
      if (!spec) continue;
      const supply = l.driver.port.supply ? power.inputRange.get(key(l.driver.uid, l.driver.port.supply)) : undefined;
      const ratio = supply ? Math.min(1.2, supply.nominal / l.motor.port.voltage) : 0;
      motorTorque = Math.min(motorTorque, spec.stallTorqueKgCm * ratio * 0.5);
   }
   for (const n of all) if (n.part.category === "motor") motorCount += n.inst.count;
   if (!Number.isFinite(motorTorque)) motorTorque = 0;

   // Servos: usable torque = stall × voltage ratio × 60 %
   let strong = 0;
   let weak = Infinity;
   let servoCount = 0;
   let servoMassKg = 0;
   for (const n of all) {
      const s = n.part.servo;
      if (!s) continue;
      servoCount += n.inst.count;
      servoMassKg += (n.part.massG * n.inst.count) / 1000;
      const vp = n.part.ports.find((p) => p.kind === "power-in");
      const supply = vp ? power.inputRange.get(key(n.inst.uid, vp.id)) : undefined;
      const ratio = supply ? Math.min(1.15, supply.nominal / s.torqueAtV) : 0;
      const usable = s.stallTorqueKgCm * ratio * 0.6;
      strong = Math.max(strong, usable);
      weak = Math.min(weak, usable);
   }
   if (!Number.isFinite(weak)) weak = 0;

   return {
      frame,
      spec: frame?.part.frame,
      massKg,
      motorCount,
      servoCount,
      motorTorqueKgCm: motorTorque,
      servoStrongKgCm: strong,
      servoWeakKgCm: weak,
      servoMassKg,
   };
}

export type TerrainKind = "smooth" | "rough";

/** Torque each drive motor needs (kg·cm) to climb `slopeDeg` and accelerate at 0.5 m/s². */
export function wheelTorqueNeeded(m: MechanicsModel, slopeDeg: number, terrain: TerrainKind): number {
   const spec = m.spec;
   if (!spec?.wheelRadiusM || m.motorCount === 0) return Infinity;
   const crr = terrain === "rough" ? 0.1 : 0.03;
   const theta = (slopeDeg * Math.PI) / 180;
   const force = m.massKg * G * (Math.sin(theta) + crr * Math.cos(theta)) + m.massKg * 0.5;
   const eff = spec.locomotion === "wheels-mecanum" ? 0.7 : spec.locomotion === "tracks" ? 0.6 : 0.85;
   const driven = spec.locomotion === "wheels-ackermann" ? Math.max(1, m.motorCount) : m.motorCount;
   return toKgCm((force * spec.wheelRadiusM) / driven / eff);
}

/** Torque the most loaded leg joint needs (kg·cm), with an extra factor for slopes/steps. */
export function legTorqueNeeded(m: MechanicsModel, factor = 1): number {
   const spec = m.spec;
   if (!spec?.supportLegs) return Infinity;
   const leverCm = (spec.jointLeverM ?? (spec.reachM ?? 0.1) * 0.6) * 100;
   return (m.massKg / spec.supportLegs) * leverCm * factor;
}

/** Shoulder torque (kg·cm) to hold `payloadKg` at `reachM` (default: full reach). */
export function armTorqueNeeded(m: MechanicsModel, payloadKg: number, reachM?: number): number {
   const reachCm = (reachM ?? m.spec?.reachM ?? 0) * 100;
   // Links plus the servos beyond base and shoulder, centred at half reach
   const servos = Math.max(1, m.servoCount);
   const armMassKg = 0.08 + 0.5 * m.servoMassKg * (Math.max(0, servos - 2) / servos);
   return (payloadKg + 0.05) * reachCm + (armMassKg * reachCm) / 2;
}

export function checkMechanics(g: Graph, m: MechanicsModel): Issue[] {
   const issues: Issue[] = [];
   const spec = m.spec;
   if (!spec || !m.frame) return issues;
   const frameUid = m.frame.inst.uid;

   if (spec.motors > 0 && m.motorCount < spec.motors) {
      issues.push({
         id: "motor-count",
         severity: "error",
         category: "completeness",
         title: `${nodeName(m.frame)} needs ${spec.motors} drive motors (you have ${m.motorCount})`,
         detail: "Add motors (and enough driver channels) for every driven wheel or track.",
         uids: [frameUid],
      });
   }
   if (spec.servos > 0 && m.servoCount < spec.servos) {
      issues.push({
         id: "servo-count",
         severity: "error",
         category: "completeness",
         title: `${nodeName(m.frame)} needs ${spec.servos} servos (you have ${m.servoCount})`,
         detail: "Each joint needs a servo. With fewer, some joints are dead and the robot can't move as designed.",
         uids: [frameUid],
      });
   } else if (spec.servos > 0 && m.servoCount > spec.servos) {
      issues.push({
         id: "servo-extra",
         severity: "info",
         category: "mechanical",
         title: `${m.servoCount - spec.servos} more servos than the frame's joints`,
         detail: "Extra servos add weight and current draw without adding motion — fine if you're adding a pan/tilt or gripper.",
         uids: [frameUid],
      });
   }

   // Flat-ground drive torque
   if (spec.wheelRadiusM && m.motorCount >= spec.motors && spec.motors > 0) {
      const need = wheelTorqueNeeded(m, 0, "smooth");
      if (m.motorTorqueKgCm > 0 && m.motorTorqueKgCm < need) {
         issues.push({
            id: "drive-torque",
            severity: "error",
            category: "mechanical",
            title: `Motors too weak to move ${m.massKg.toFixed(2)} kg`,
            detail: `Each motor needs about ${need.toFixed(2)} kg·cm to get going but provides ~${m.motorTorqueKgCm.toFixed(
               2,
            )} kg·cm at its supply voltage. Use stronger motors or make the robot lighter.`,
            uids: [frameUid],
         });
      }
   }

   // Legs: standing/walking torque
   if (spec.locomotion === "legs" && m.servoCount >= spec.servos) {
      const need = legTorqueNeeded(m);
      if (m.servoWeakKgCm < need) {
         issues.push({
            id: "leg-torque",
            severity: m.servoStrongKgCm < need ? "error" : "warning",
            category: "mechanical",
            title: `Leg servos too weak for ${m.massKg.toFixed(2)} kg`,
            detail: `While walking, ${spec.supportLegs} leg${spec.supportLegs === 1 ? "" : "s"} carry the robot: each loaded joint needs ~${need.toFixed(
               1,
            )} kg·cm, but your weakest servo gives ~${m.servoWeakKgCm.toFixed(1)} kg·cm usable (60 % of stall at its voltage). It will sag, overheat or strip gears. Use stronger servos or cut weight.`,
            uids: [frameUid],
         });
      }
   }

   // Arm: hold a 100 g payload at full reach
   if (spec.reachM && (spec.archetype === "robot-arm" || spec.archetype === "mobile-manipulator") && m.servoCount > 0) {
      const need = armTorqueNeeded(m, 0.1);
      if (m.servoStrongKgCm < need) {
         issues.push({
            id: "arm-torque",
            severity: "warning",
            category: "mechanical",
            title: "Shoulder servo too weak for a 100 g payload at full reach",
            detail: `Holding 100 g at ${(spec.reachM * 100).toFixed(0)} cm needs ~${need.toFixed(
               1,
            )} kg·cm at the shoulder; your strongest servo gives ~${m.servoStrongKgCm.toFixed(1)} kg·cm usable. Use a high-torque servo for the shoulder or lift lighter objects.`,
            uids: [frameUid],
         });
      }
   }

   return issues;
}
