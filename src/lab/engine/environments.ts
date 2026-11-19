import type { Build, EnvironmentResult, TestCriterion, TestVerdict } from "../model/types";
import { analyse, type Analysis } from ".";
import { coolingAt } from "./compute";
import { armTorqueNeeded, legTorqueNeeded, wheelTorqueNeeded } from "./mechanical";

export interface Environment {
   id: string;
   name: string;
   description: string;
   ambientC: number;
   durationMin: number;
   slopeDeg: number;
   terrain: "smooth" | "rough" | "stairs";
   stepHeightM?: number;
   /** Extra motor/servo effort vs. flat ground (multiplies actuator power). */
   effort: number;
   needs: {
      mobility?: boolean;
      mapping?: boolean;
      vision?: boolean;
      detection?: boolean;
      manipulation?: { payloadKg: number; reachM: number };
      voice?: boolean;
      untethered?: boolean;
   };
   /** Scene used by the 3D view. */
   scene: "bench" | "ramp" | "yard" | "stairs" | "warehouse" | "table" | "desert" | "track";
}

export const ENVIRONMENTS: Environment[] = [
   {
      id: "bench",
      name: "Lab bench",
      description: "Power-on test on a flat table at room temperature: does everything boot and run?",
      ambientC: 22,
      durationMin: 10,
      slopeDeg: 0,
      terrain: "smooth",
      effort: 1,
      needs: {},
      scene: "bench",
   },
   {
      id: "ramp",
      name: "15° ramp",
      description: "Climb a 15° ramp (27 % grade) without stalling.",
      ambientC: 25,
      durationMin: 15,
      slopeDeg: 15,
      terrain: "smooth",
      effort: 1.6,
      needs: { mobility: true, untethered: true },
      scene: "ramp",
   },
   {
      id: "yard",
      name: "Rough yard, 35 °C",
      description: "Gravel and grass with 8° bumps on a warm day for 30 minutes.",
      ambientC: 35,
      durationMin: 30,
      slopeDeg: 8,
      terrain: "rough",
      effort: 1.8,
      needs: { mobility: true, untethered: true },
      scene: "yard",
   },
   {
      id: "stairs",
      name: "Stairs (12 cm steps)",
      description: "Climb three 12 cm steps.",
      ambientC: 22,
      durationMin: 10,
      slopeDeg: 0,
      terrain: "stairs",
      stepHeightM: 0.12,
      effort: 2,
      needs: { mobility: true, untethered: true },
      scene: "stairs",
   },
   {
      id: "warehouse",
      name: "Warehouse navigation",
      description: "Map an unknown warehouse aisle and navigate to waypoints around obstacles for 45 minutes.",
      ambientC: 25,
      durationMin: 45,
      slopeDeg: 0,
      terrain: "smooth",
      effort: 1.2,
      needs: { mobility: true, mapping: true, untethered: true },
      scene: "warehouse",
   },
   {
      id: "pick-place",
      name: "Pick and place",
      description: "Detect a 150 g object with the camera and move it 20 cm away.",
      ambientC: 22,
      durationMin: 20,
      slopeDeg: 0,
      terrain: "smooth",
      effort: 1.3,
      needs: { vision: true, detection: true, manipulation: { payloadKg: 0.15, reachM: 0.2 } },
      scene: "table",
   },
   {
      id: "heatwave",
      name: "Heatwave, 40 °C",
      description: "Run the main computer at full AI load for 20 minutes in 40 °C shade.",
      ambientC: 40,
      durationMin: 20,
      slopeDeg: 0,
      terrain: "smooth",
      effort: 1,
      needs: { untethered: true },
      scene: "desert",
   },
   {
      id: "voice",
      name: "Voice command fetch",
      description: '"Bring me the red cup": hear the request, understand it with a language model and act.',
      ambientC: 22,
      durationMin: 15,
      slopeDeg: 0,
      terrain: "smooth",
      effort: 1.2,
      needs: { voice: true, vision: true },
      scene: "warehouse",
   },
   {
      id: "endurance",
      name: "Endurance hour",
      description: "Keep patrolling for 60 minutes on one charge.",
      ambientC: 25,
      durationMin: 60,
      slopeDeg: 0,
      terrain: "smooth",
      effort: 1.1,
      needs: { mobility: true, untethered: true },
      scene: "track",
   },
];

export function getEnvironment(id: string): Environment | undefined {
   return ENVIRONMENTS.find((e) => e.id === id);
}

const RANK: Record<TestVerdict, number> = { pass: 0, warn: 1, fail: 2 };
const worst = (vs: TestVerdict[]): TestVerdict => vs.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), "pass");

/** Runs one environment test on an already analysed build. */
export function runEnvironment(a: Analysis, env: Environment): EnvironmentResult {
   const c: TestCriterion[] = [];
   const { report, compute, mechanics, graph } = a;
   const parts = [...graph.nodes.values()];
   const spec = mechanics.spec;
   const loco = spec?.locomotion;
   const sensors = parts.flatMap((n) => (a.power.powered.get(n.inst.uid) ? (n.part.sensor?.provides ?? []) : []));
   const has = (cap: string) => sensors.includes(cap as never);

   // 1. Electrical
   const errors = report.issues.filter((i) => i.severity === "error");
   const powerWarnings = report.issues.filter((i) => i.severity === "warning" && i.category === "power");
   c.push({
      label: "Electrical check",
      verdict: errors.length ? "fail" : powerWarnings.length ? "warn" : "pass",
      detail: errors.length
         ? `${errors.length} wiring/power error${errors.length > 1 ? "s" : ""} — the robot won't run safely. Fix the issues list first.`
         : powerWarnings.length
           ? `Runs, but ${powerWarnings.length} power warning${powerWarnings.length > 1 ? "s" : ""} may cause brownouts under load.`
           : "All parts powered within their ratings.",
   });

   // 2. Power source / runtime
   const tethered = parts.some((n) => n.part.battery?.tethered);
   if (env.needs.untethered && tethered) {
      c.push({
         label: "Power source",
         verdict: "fail",
         detail: "Runs from a bench supply — it can't leave the cable for this test. Add a battery.",
      });
   } else if (!tethered) {
      const baseW = report.stats.avgPowerW;
      // Actuators are what scale with terrain; electronics stay roughly constant
      const actuatorShare = mechanics.motorCount + mechanics.servoCount > 0 ? 0.55 : 0;
      const loadW = baseW * (1 - actuatorShare + actuatorShare * env.effort) * (env.ambientC >= 35 ? 1.08 : 1);
      const minutes = report.stats.batteryWh > 0 && loadW > 0 ? ((report.stats.batteryWh * 0.85) / loadW) * 60 : 0;
      c.push({
         label: "Runtime",
         verdict: minutes >= env.durationMin * 1.25 ? "pass" : minutes >= env.durationMin ? "warn" : "fail",
         detail: `About ${Math.round(minutes)} min at ~${loadW.toFixed(1)} W here; the test needs ${env.durationMin} min.`,
      });
   }

   // 3. Thermal at this ambient
   if (compute.main && compute.loadWatts > 3) {
      const cap = coolingAt(compute, env.ambientC);
      const ratio = compute.loadWatts / Math.max(cap, 0.01);
      c.push({
         label: `Cooling at ${env.ambientC} °C`,
         verdict: ratio <= 1 ? "pass" : ratio <= 1.3 ? "warn" : "fail",
         detail:
            ratio <= 1
               ? `${compute.loadWatts} W of heat, ~${cap.toFixed(0)} W of cooling — stays below ${compute.throttleC} °C.`
               : `${compute.loadWatts} W of heat but only ~${cap.toFixed(0)} W of cooling at ${env.ambientC} °C — it will ${
                    ratio > 1.3 ? "throttle hard and may shut down" : "throttle"
                 }.`,
      });
   }

   // 4. Mobility
   if (env.needs.mobility) {
      if (!spec || loco === "fixed") {
         c.push({ label: "Mobility", verdict: "fail", detail: "This robot has a fixed base — it can't drive or walk." });
      } else if (env.terrain === "stairs") {
         if (loco === "legs") {
            const lever = (spec.reachM ?? 0) >= (env.stepHeightM ?? 0) * 0.8;
            const need = legTorqueNeeded(mechanics, 1.4);
            c.push({
               label: "Stair climbing",
               verdict: !lever ? "fail" : mechanics.servoWeakKgCm >= need ? "pass" : "warn",
               detail: !lever
                  ? `Legs (${((spec.reachM ?? 0) * 100).toFixed(0)} cm) are too short for ${(env.stepHeightM ?? 0) * 100} cm steps.`
                  : `Lifting onto a step needs ~${need.toFixed(1)} kg·cm per joint; weakest servo gives ~${mechanics.servoWeakKgCm.toFixed(1)} kg·cm.`,
            });
         } else {
            c.push({
               label: "Stair climbing",
               verdict: "fail",
               detail: `${loco === "tracks" ? "Tracks" : "Wheels"} of this size can't climb ${(env.stepHeightM ?? 0) * 100} cm steps — that needs legs.`,
            });
         }
      } else if (loco === "legs") {
         const need = legTorqueNeeded(mechanics, 1 + Math.sin((env.slopeDeg * Math.PI) / 180) + (env.terrain === "rough" ? 0.15 : 0));
         c.push({
            label: env.slopeDeg ? `Walking on a ${env.slopeDeg}° slope` : "Walking",
            verdict: mechanics.servoWeakKgCm >= need ? "pass" : mechanics.servoStrongKgCm >= need ? "warn" : "fail",
            detail: `Needs ~${need.toFixed(1)} kg·cm per loaded joint; weakest servo gives ~${mechanics.servoWeakKgCm.toFixed(1)} kg·cm.`,
         });
      } else {
         const need = wheelTorqueNeeded(mechanics, env.slopeDeg, env.terrain === "rough" ? "rough" : "smooth");
         const have = mechanics.motorTorqueKgCm;
         let verdict: TestVerdict = have >= need * 1.3 ? "pass" : have >= need ? "warn" : "fail";
         let extra = "";
         if (env.terrain === "rough" && loco === "wheels-mecanum") {
            verdict = worst([verdict, "warn"]);
            extra = " Mecanum rollers clog and slip on gravel and grass.";
         }
         c.push({
            label: env.slopeDeg ? `Driving up ${env.slopeDeg}°` : "Driving",
            verdict,
            detail: `Each motor needs ~${need.toFixed(2)} kg·cm; provides ~${have.toFixed(2)} kg·cm usable.${extra}`,
         });
      }
   }

   // 5. Mapping / navigation
   if (env.needs.mapping) {
      const ranging = has("mapping") || has("depth");
      const slamCompute = compute.runsLinux && compute.cpuScore >= 2;
      c.push({
         label: "Mapping & navigation (SLAM)",
         verdict: !ranging || !compute.runsLinux ? "fail" : slamCompute ? "pass" : "warn",
         detail: !ranging
            ? "Needs a LiDAR or depth camera to build a map."
            : !compute.runsLinux
              ? "SLAM needs a Linux computer (ROS 2); a microcontroller can't run it."
              : slamCompute
                ? "LiDAR/depth + a capable computer: real-time SLAM and Nav2 are realistic."
                : "This computer is too slow for real-time SLAM — expect lag and lost localisation.",
      });
   }

   // 6. Vision / detection
   if (env.needs.vision) {
      c.push({
         label: "Camera",
         verdict: has("vision") ? "pass" : "fail",
         detail: has("vision") ? "Camera connected and powered." : "No working camera on a computer that can read it.",
      });
   }
   if (env.needs.detection) {
      const tops = compute.tops;
      const fps = tops >= 20 ? 30 : tops >= 4 ? 20 : compute.runsLinux ? Math.max(1, Math.round(compute.cpuScore * 2)) : 0;
      c.push({
         label: "Object detection (YOLO-class)",
         verdict: fps >= 15 ? "pass" : fps >= 4 ? "warn" : "fail",
         detail:
            fps === 0
               ? "No computer that can run a neural network."
               : `About ${fps} FPS with ${tops ? `${tops} TOPS of acceleration` : "the CPU only"}${fps < 15 ? " — usable, but grasping moving objects will be unreliable." : "."}`,
      });
   }

   // 7. Manipulation
   if (env.needs.manipulation) {
      const canGrasp = spec?.archetype === "robot-arm" || spec?.archetype === "mobile-manipulator";
      if (!canGrasp) {
         c.push({ label: "Manipulation", verdict: "fail", detail: "No arm or gripper on this robot." });
      } else {
         const need = armTorqueNeeded(mechanics, env.needs.manipulation.payloadKg, env.needs.manipulation.reachM);
         c.push({
            label: `Lift ${env.needs.manipulation.payloadKg * 1000} g at ${env.needs.manipulation.reachM * 100} cm`,
            verdict: mechanics.servoStrongKgCm >= need * 1.2 ? "pass" : mechanics.servoStrongKgCm >= need ? "warn" : "fail",
            detail: `Shoulder needs ~${need.toFixed(1)} kg·cm; strongest servo gives ~${mechanics.servoStrongKgCm.toFixed(1)} kg·cm usable.`,
         });
      }
   }

   // 8. Voice + language model
   if (env.needs.voice) {
      const mic = has("audio");
      const onDevice = compute.ramGB >= 8 && compute.tops >= 20;
      c.push({
         label: "Voice + language model",
         verdict: !mic ? "fail" : onDevice ? "pass" : compute.wifi ? "warn" : "fail",
         detail: !mic
            ? "No microphone / voice module."
            : onDevice
              ? `Speech and a small language model can run on board (${compute.ramGB} GB, ${compute.tops} TOPS).`
              : compute.wifi
                ? "Too little memory/AI compute for an on-device language model — it must call a cloud model over Wi-Fi."
                : "No on-device capacity and no Wi-Fi for a cloud model.",
      });
   }

   return { environmentId: env.id, verdict: worst(c.map((x) => x.verdict)), criteria: c };
}

export function runAllEnvironments(build: Build): EnvironmentResult[] {
   const a = analyse(build);
   return ENVIRONMENTS.map((env) => runEnvironment(a, env));
}
