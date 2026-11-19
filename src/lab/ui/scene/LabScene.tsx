"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { ArchetypeId, TestVerdict } from "../../model/types";
import type { Environment } from "../../engine/environments";

export interface SceneRobot {
   archetype: ArchetypeId;
   lidar: boolean;
   camera: boolean;
   fan: boolean;
   /** A Linux computer is fitted (drawn as a board with heatsink). */
   computer: boolean;
}

type Props = {
   robot: SceneRobot;
   scene: Environment["scene"];
   verdict: TestVerdict;
   /** False when the environment test says the robot can't move. */
   moving: boolean;
   animate: boolean;
   onReady?: () => void;
};

type Palette = Record<"background" | "surface" | "ink" | "muted" | "line" | "camera" | "lidar" | "fused" | "success" | "warning", string>;

/** three.js can't parse oklch, so resolve tokens to rgb() through a 1px canvas. */
function readToken(ctx: CanvasRenderingContext2D, name: string): string {
   const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
   ctx.fillStyle = "#808080";
   if (value) ctx.fillStyle = value;
   ctx.fillRect(0, 0, 1, 1);
   const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
   return `rgb(${r},${g},${b})`;
}

function usePalette(): Palette | null {
   const [palette, setPalette] = useState<Palette | null>(null);
   useEffect(() => {
      const read = () => {
         const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
         if (!ctx) return;
         const keys = ["background", "surface", "ink", "muted", "line", "camera", "lidar", "fused", "success", "warning"] as const;
         setPalette(Object.fromEntries(keys.map((k) => [k, readToken(ctx, `--${k}`)])) as Palette);
      };
      read();
      const observer = new MutationObserver(read);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      return () => observer.disconnect();
   }, []);
   return palette;
}

// ─── Paths through each environment ─────────────────────────────────────────

interface Pose {
   x: number;
   y: number;
   z: number;
   heading: number;
   pitch: number;
}

const RAMP_HALF = 0.55;
const RAMP_SLOPE = Math.tan((15 * Math.PI) / 180);
const STEP_W = 0.16;
const STEP_H = 0.06;
const STAIRS_X0 = -0.3;
const STAIRS_END = 0.95;

function poseAt(scene: Props["scene"], t: number, moving: boolean): Pose {
   if (scene === "table") return { x: 0, y: 0, z: 0, heading: 0, pitch: 0 };
   // Stuck robots wait at the foot of the ramp or stairs, facing them
   if (!moving) return scene === "ramp" || scene === "stairs" ? { x: -0.75, y: 0, z: 0, heading: Math.PI, pitch: 0 } : { x: 0, y: 0, z: 0, heading: 0, pitch: 0 };
   if (scene === "ramp" || scene === "stairs") {
      // Back and forth along x; the robot turns round at each end
      const s = Math.sin(t * 0.35);
      const x = s * 0.75;
      const forward = Math.cos(t * 0.35) >= 0;
      let y = 0;
      let pitch = 0;
      if (scene === "ramp" && Math.abs(x) <= RAMP_HALF) {
         y = (x + RAMP_HALF) * RAMP_SLOPE * 0.5;
         pitch = Math.atan(RAMP_SLOPE * 0.5);
      } else if (scene === "ramp" && x > RAMP_HALF) y = RAMP_HALF * RAMP_SLOPE;
      if (scene === "stairs") y = Math.max(0, Math.min(4, Math.floor((x - STAIRS_X0) / STEP_W) + 1)) * STEP_H;
      // Robot fronts face local −x; a negative z-rotation lifts the front
      return { x, y, z: 0, heading: forward ? Math.PI : 0, pitch: forward ? -pitch : pitch };
   }
   const r = scene === "track" ? 0.75 : scene === "bench" ? 0.3 : 0.5;
   const a = t * (scene === "track" ? 0.45 : 0.3);
   return { x: Math.cos(a) * r, y: 0, z: Math.sin(a) * r, heading: Math.PI / 2 - a, pitch: 0 };
}

// ─── Environment props ──────────────────────────────────────────────────────

function Ground({ scene, p }: { scene: Props["scene"]; p: Palette }) {
   const groundColour = scene === "desert" ? "rgb(150,118,72)" : scene === "yard" ? "rgb(70,88,60)" : p.surface;
   const rocks = useMemo(() => {
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      return Array.from({ length: 26 }, () => ({ x: (rnd() - 0.5) * 2.4, z: (rnd() - 0.5) * 2.4, s: 0.015 + rnd() * 0.035 }));
   }, []);

   return (
      <group>
         <mesh rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[4, 4]} />
            <meshStandardMaterial color={groundColour} roughness={0.95} />
         </mesh>
         {scene !== "yard" && scene !== "desert" && <gridHelper args={[4, 40, p.line, p.line]} position-y={0.001} />}

         {scene === "ramp" && (
            <group>
               <mesh position={[0, (RAMP_HALF * RAMP_SLOPE) / 2 - 0.01, 0]} rotation-z={Math.atan(RAMP_SLOPE * 0.5)}>
                  <boxGeometry args={[RAMP_HALF * 2.05, 0.02, 0.6]} />
                  <meshStandardMaterial color={p.muted} roughness={0.8} />
               </mesh>
               <mesh position={[RAMP_HALF + 0.3, RAMP_HALF * RAMP_SLOPE - 0.01, 0]}>
                  <boxGeometry args={[0.6, 0.02, 0.6]} />
                  <meshStandardMaterial color={p.muted} roughness={0.8} />
               </mesh>
            </group>
         )}

         {scene === "stairs" &&
            [0, 1, 2, 3].map((i) => (
               // Stacked slabs: slab i starts at step i and runs to the landing
               <mesh key={i} position={[(STAIRS_X0 + STEP_W * i + STAIRS_END) / 2, i * STEP_H + STEP_H / 2, 0]}>
                  <boxGeometry args={[STAIRS_END - STAIRS_X0 - STEP_W * i, STEP_H, 0.7]} />
                  <meshStandardMaterial color={p.muted} roughness={0.85} />
               </mesh>
            ))}

         {(scene === "yard" || scene === "desert") &&
            rocks.map((r, i) => (
               <mesh key={i} position={[r.x, r.s * 0.5, r.z]} scale={[1, 0.6, 1.2]}>
                  <dodecahedronGeometry args={[r.s]} />
                  <meshStandardMaterial color={scene === "desert" ? "rgb(170,140,95)" : "rgb(110,110,104)"} roughness={1} flatShading />
               </mesh>
            ))}

         {scene === "warehouse" &&
            [-1, 1].map((side) =>
               [-0.8, 0, 0.8].map((z) => (
                  <group key={`${side}${z}`} position={[side * 1.05, 0, z]}>
                     {[0.15, 0.4, 0.65].map((y) => (
                        <mesh key={y} position={[0, y, 0]}>
                           <boxGeometry args={[0.3, 0.02, 0.6]} />
                           <meshStandardMaterial color={p.muted} />
                        </mesh>
                     ))}
                     <mesh position={[0, 0.27, 0.05]}>
                        <boxGeometry args={[0.2, 0.2, 0.25]} />
                        <meshStandardMaterial color={p.lidar} roughness={0.9} />
                     </mesh>
                  </group>
               )),
            )}

         {scene === "table" && (
            <group position={[0.32, 0, 0]}>
               <mesh position={[0, 0.12, 0]}>
                  <boxGeometry args={[0.4, 0.02, 0.5]} />
                  <meshStandardMaterial color={p.muted} />
               </mesh>
               <mesh position={[0, 0.06, 0]}>
                  <boxGeometry args={[0.03, 0.12, 0.03]} />
                  <meshStandardMaterial color={p.line} />
               </mesh>
               <mesh position={[-0.08, 0.15, 0.05]}>
                  <boxGeometry args={[0.04, 0.04, 0.04]} />
                  <meshStandardMaterial color={p.camera} emissive={p.camera} emissiveIntensity={0.25} />
               </mesh>
            </group>
         )}

         {scene === "track" && (
            <mesh rotation-x={-Math.PI / 2} position-y={0.002}>
               <ringGeometry args={[0.68, 0.82, 64]} />
               <meshStandardMaterial color={p.line} />
            </mesh>
         )}
      </group>
   );
}

// ─── Robots ─────────────────────────────────────────────────────────────────

// Robot materials stay the same in both themes so the models always read clearly
const SHELL = "rgb(200,206,216)";
const MID = "rgb(128,134,146)";
const DARK = "rgb(52,56,64)";

type PartProps = { p: Palette; robot: SceneRobot; t: React.RefObject<number> };

function Deck({ p, robot, t, y, length }: PartProps & { y: number; length: number }) {
   const fan = useRef<THREE.Mesh>(null);
   const sweep = useRef<THREE.Group>(null);
   useFrame(() => {
      if (fan.current && robot.fan) fan.current.rotation.y = t.current * 20;
      if (sweep.current) sweep.current.rotation.y = -t.current * 4;
   });
   return (
      <group position-y={y}>
         {robot.computer && (
            <group position={[-length * 0.1, 0.01, 0]}>
               <mesh>
                  <boxGeometry args={[0.1, 0.012, 0.08]} />
                  <meshStandardMaterial color="rgb(40,90,60)" />
               </mesh>
               <mesh position-y={0.016}>
                  <boxGeometry args={[0.06, 0.02, 0.06]} />
                  <meshStandardMaterial color={MID} metalness={0.6} roughness={0.4} />
               </mesh>
               {robot.fan && (
                  <mesh ref={fan} position-y={0.03}>
                     <cylinderGeometry args={[0.024, 0.024, 0.004, 5]} />
                     <meshStandardMaterial color={DARK} />
                  </mesh>
               )}
            </group>
         )}
         {robot.lidar && (
            <group position={[length * 0.22, 0.03, 0]}>
               <mesh>
                  <cylinderGeometry args={[0.035, 0.038, 0.04, 24]} />
                  <meshStandardMaterial color={SHELL} />
               </mesh>
               <mesh position-y={0.012}>
                  <torusGeometry args={[0.036, 0.004, 8, 32]} />
                  <meshStandardMaterial color={p.lidar} emissive={p.lidar} emissiveIntensity={0.6} />
               </mesh>
               <group ref={sweep} position-y={0.012}>
                  <mesh position-x={0.35} rotation-x={-Math.PI / 2}>
                     <planeGeometry args={[0.7, 0.004]} />
                     <meshBasicMaterial color={p.lidar} transparent opacity={0.55} />
                  </mesh>
               </group>
            </group>
         )}
         {robot.camera && (
            <group position={[-length * 0.5 + 0.015, 0.035, 0]}>
               <mesh>
                  <boxGeometry args={[0.025, 0.025, 0.09]} />
                  <meshStandardMaterial color={SHELL} />
               </mesh>
               {[-0.025, 0.025].map((z) => (
                  <mesh key={z} position={[-0.013, 0, z]} rotation-z={Math.PI / 2}>
                     <cylinderGeometry args={[0.008, 0.008, 0.004, 16]} />
                     <meshStandardMaterial color={p.camera} emissive={p.camera} emissiveIntensity={0.7} />
                  </mesh>
               ))}
            </group>
         )}
      </group>
   );
}

function Rover({ p, robot, t, moving }: PartProps & { moving: boolean }) {
   const wheels = useRef<(THREE.Mesh | null)[]>([]);
   const kind = robot.archetype;
   const ack = kind === "ackermann-car";
   const tank = kind === "tank-rover";
   const L = ack ? 0.36 : 0.3;
   const W = ack ? 0.18 : 0.22;
   const R = 0.035;
   useFrame(() => {
      if (!moving) return;
      wheels.current.forEach((w) => w && (w.rotation.y = t.current * 6));
   });
   const corners: [number, number][] = [
      [-L / 2 + 0.05, -W / 2 - 0.02],
      [-L / 2 + 0.05, W / 2 + 0.02],
      [L / 2 - 0.05, -W / 2 - 0.02],
      [L / 2 - 0.05, W / 2 + 0.02],
   ];
   return (
      <group>
         <mesh position-y={R + 0.03}>
            <boxGeometry args={[L, 0.05, W]} />
            <meshStandardMaterial color={SHELL} metalness={0.3} roughness={0.6} />
         </mesh>
         {tank
            ? [-1, 1].map((s) => (
                 <mesh key={s} position={[0, R, s * (W / 2 + 0.025)]}>
                    <boxGeometry args={[L + 0.04, R * 2, 0.04]} />
                    <meshStandardMaterial color={DARK} roughness={0.95} />
                 </mesh>
              ))
            : corners.map(([x, z], i) => (
                 <group key={i} position={[x, R, z]} rotation-x={Math.PI / 2}>
                    <mesh ref={(m) => void (wheels.current[i] = m)}>
                       <cylinderGeometry args={[R, R, 0.03, kind === "mecanum-rover" ? 10 : 24]} />
                       <meshStandardMaterial color={kind === "mecanum-rover" ? MID : DARK} roughness={0.9} flatShading={kind === "mecanum-rover"} />
                    </mesh>
                 </group>
              ))}
         <Deck p={p} robot={robot} t={t} y={R + 0.055} length={L} />
      </group>
   );
}

function Arm({ p, t, moving, scale = 1 }: { p: Palette; t: React.RefObject<number>; moving: boolean; scale?: number }) {
   const base = useRef<THREE.Group>(null);
   const shoulder = useRef<THREE.Group>(null);
   const elbow = useRef<THREE.Group>(null);
   const grip = useRef<(THREE.Mesh | null)[]>([]);
   useFrame(() => {
      const s = moving ? t.current : 0;
      if (base.current) base.current.rotation.y = Math.sin(s * 0.6) * 0.8;
      if (shoulder.current) shoulder.current.rotation.z = -0.35 + Math.sin(s * 0.9) * 0.35;
      if (elbow.current) elbow.current.rotation.z = -1.1 + Math.sin(s * 0.9 + 1) * 0.4;
      const open = 0.012 + Math.max(0, Math.sin(s * 1.8)) * 0.012;
      grip.current.forEach((g, i) => g && (g.position.z = (i ? 1 : -1) * open));
   });
   const link = (len: number) => (
      <mesh position-y={len / 2}>
         <boxGeometry args={[0.03, len, 0.035]} />
         <meshStandardMaterial color={SHELL} metalness={0.4} roughness={0.5} />
      </mesh>
   );
   const joint = (
      <mesh rotation-x={Math.PI / 2}>
         <cylinderGeometry args={[0.02, 0.02, 0.045, 16]} />
         <meshStandardMaterial color={p.fused} />
      </mesh>
   );
   return (
      <group scale={scale}>
         <mesh position-y={0.02}>
            <cylinderGeometry args={[0.055, 0.065, 0.04, 24]} />
            <meshStandardMaterial color={DARK} />
         </mesh>
         <group ref={base} position-y={0.04}>
            <group ref={shoulder} position-y={0.03}>
               {joint}
               {link(0.12)}
               <group ref={elbow} position-y={0.12}>
                  {joint}
                  {link(0.11)}
                  <group position-y={0.12}>
                     <mesh>
                        <boxGeometry args={[0.02, 0.02, 0.05]} />
                        <meshStandardMaterial color={MID} />
                     </mesh>
                     {[0, 1].map((i) => (
                        <mesh key={i} ref={(m) => void (grip.current[i] = m)} position-y={0.025}>
                           <boxGeometry args={[0.008, 0.035, 0.006]} />
                           <meshStandardMaterial color={p.camera} />
                        </mesh>
                     ))}
                  </group>
               </group>
            </group>
         </group>
      </group>
   );
}

function Dog({ p, robot, t, moving }: PartProps & { moving: boolean }) {
   const hips = useRef<(THREE.Group | null)[]>([]);
   const knees = useRef<(THREE.Group | null)[]>([]);
   const body = useRef<THREE.Group>(null);
   const legs: [number, number, number][] = [
      [-0.11, -0.06, 0],
      [-0.11, 0.06, Math.PI],
      [0.11, -0.06, Math.PI],
      [0.11, 0.06, 0],
   ];
   useFrame(() => {
      const s = t.current * 6;
      legs.forEach(([, , phase], i) => {
         const swing = moving ? Math.sin(s + phase) * 0.35 : 0;
         const lift = moving ? Math.max(0, Math.sin(s + phase + Math.PI / 2)) * 0.5 : 0;
         if (hips.current[i]) hips.current[i]!.rotation.z = 0.5 + swing;
         if (knees.current[i]) knees.current[i]!.rotation.z = -1.0 - lift;
      });
      if (body.current) body.current.position.y = 0.17 + (moving ? Math.abs(Math.sin(s)) * 0.004 : -0.03);
   });
   return (
      <group ref={body} position-y={0.17}>
         <mesh>
            <boxGeometry args={[0.3, 0.07, 0.13]} />
            <meshStandardMaterial color={SHELL} metalness={0.3} roughness={0.55} />
         </mesh>
         <mesh position={[-0.17, 0.03, 0]}>
            <boxGeometry args={[0.06, 0.05, 0.08]} />
            <meshStandardMaterial color={SHELL} />
         </mesh>
         <Deck p={p} robot={robot} t={t} y={0.035} length={0.3} />
         {legs.map(([x, z], i) => (
            <group key={i} position={[x, -0.02, z]} ref={(g) => void (hips.current[i] = g)}>
               <mesh position-y={-0.05}>
                  <boxGeometry args={[0.025, 0.1, 0.025]} />
                  <meshStandardMaterial color={DARK} />
               </mesh>
               <group position-y={-0.1} ref={(g) => void (knees.current[i] = g)}>
                  <mesh position-y={-0.05}>
                     <boxGeometry args={[0.018, 0.1, 0.018]} />
                     <meshStandardMaterial color={MID} />
                  </mesh>
                  <mesh position-y={-0.1}>
                     <sphereGeometry args={[0.012, 12, 8]} />
                     <meshStandardMaterial color={DARK} />
                  </mesh>
               </group>
            </group>
         ))}
      </group>
   );
}

function Hexapod({ p, robot, t, moving }: PartProps & { moving: boolean }) {
   const coxa = useRef<(THREE.Group | null)[]>([]);
   const femur = useRef<(THREE.Group | null)[]>([]);
   const angles = [0, 1, 2, 3, 4, 5].map((i) => (i / 6) * Math.PI * 2 + Math.PI / 6);
   useFrame(() => {
      const s = t.current * 5;
      angles.forEach((_, i) => {
         const phase = i % 2 ? Math.PI : 0; // tripod gait
         if (coxa.current[i]) coxa.current[i]!.rotation.y = moving ? Math.sin(s + phase) * 0.3 : 0;
         if (femur.current[i]) femur.current[i]!.rotation.z = 0.35 + (moving ? Math.max(0, Math.sin(s + phase + Math.PI / 2)) * 0.35 : -0.2);
      });
   });
   return (
      <group position-y={0.1}>
         <mesh>
            <cylinderGeometry args={[0.1, 0.1, 0.04, 6]} />
            <meshStandardMaterial color={SHELL} metalness={0.3} roughness={0.55} />
         </mesh>
         <Deck p={p} robot={robot} t={t} y={0.02} length={0.2} />
         {angles.map((a, i) => (
            <group key={i} rotation-y={-a} position={[Math.cos(a) * 0.09, 0, Math.sin(a) * 0.09]}>
               <group ref={(g) => void (coxa.current[i] = g)}>
                  <group ref={(g) => void (femur.current[i] = g)}>
                     <mesh position-x={0.04}>
                        <boxGeometry args={[0.08, 0.018, 0.02]} />
                        <meshStandardMaterial color={DARK} />
                     </mesh>
                     <group position-x={0.08} rotation-z={-1.75}>
                        <mesh position-x={0.06}>
                           <boxGeometry args={[0.12, 0.014, 0.016]} />
                           <meshStandardMaterial color={MID} />
                        </mesh>
                     </group>
                  </group>
               </group>
            </group>
         ))}
      </group>
   );
}

function Humanoid({ p, robot, t, moving }: PartProps & { moving: boolean }) {
   const limbs = useRef<(THREE.Group | null)[]>([]);
   const knees = useRef<(THREE.Group | null)[]>([]);
   useFrame(() => {
      const s = t.current * 4;
      const swing = moving ? Math.sin(s) * 0.4 : 0;
      const [la, ra, ll, rl] = limbs.current;
      if (la) la.rotation.z = swing;
      if (ra) ra.rotation.z = -swing;
      if (ll) ll.rotation.z = -swing;
      if (rl) rl.rotation.z = swing;
      knees.current.forEach((k, i) => k && (k.rotation.z = moving ? Math.max(0, Math.sin(s + (i ? Math.PI : 0))) * 0.6 : 0));
   });
   const limb = (len: number, w: number, colour: string) => (
      <mesh position-y={-len / 2}>
         <boxGeometry args={[w, len, w]} />
         <meshStandardMaterial color={colour} />
      </mesh>
   );
   return (
      <group position-y={0.17}>
         <mesh position-y={0.075}>
            <boxGeometry args={[0.07, 0.13, 0.12]} />
            <meshStandardMaterial color={SHELL} metalness={0.3} roughness={0.55} />
         </mesh>
         <mesh position-y={0.17}>
            <boxGeometry args={[0.055, 0.05, 0.06]} />
            <meshStandardMaterial color={SHELL} />
         </mesh>
         {robot.camera && (
            <mesh position={[-0.029, 0.175, 0]}>
               <boxGeometry args={[0.004, 0.012, 0.04]} />
               <meshStandardMaterial color={p.camera} emissive={p.camera} emissiveIntensity={0.8} />
            </mesh>
         )}
         {[-1, 1].map((s, i) => (
            <group key={`a${s}`} position={[0, 0.13, s * 0.075]} ref={(g) => void (limbs.current[i] = g)}>
               {limb(0.12, 0.022, DARK)}
            </group>
         ))}
         {[-1, 1].map((s, i) => (
            <group key={`l${s}`} position={[0, 0.005, s * 0.03]} ref={(g) => void (limbs.current[i + 2] = g)}>
               {limb(0.085, 0.028, DARK)}
               <group position-y={-0.085} ref={(g) => void (knees.current[i] = g)}>
                  {limb(0.085, 0.024, MID)}
               </group>
            </group>
         ))}
      </group>
   );
}

function Robot({ p, robot, t, moving, scene }: PartProps & { moving: boolean; scene: Props["scene"] }) {
   const a = robot.archetype;
   if (a === "robot-arm") {
      return (
         <group position={scene === "table" ? [0.12, 0.13, 0] : [0, 0, 0]} rotation-y={Math.PI}>
            <Arm p={p} t={t} moving={moving} scale={1.1} />
         </group>
      );
   }
   if (a === "robot-dog") return <Dog p={p} robot={robot} t={t} moving={moving} />;
   if (a === "hexapod") return <Hexapod p={p} robot={robot} t={t} moving={moving} />;
   if (a === "humanoid") return <Humanoid p={p} robot={robot} t={t} moving={moving} />;
   return (
      <group>
         <Rover p={p} robot={robot} t={t} moving={moving} />
         {a === "mobile-manipulator" && (
            <group position={[-0.06, 0.09, 0]}>
               <Arm p={p} t={t} moving={moving} scale={0.8} />
            </group>
         )}
      </group>
   );
}

function World({ robot, scene, verdict, moving, animate, p }: Omit<Props, "onReady"> & { p: Palette }) {
   const t = useRef(0);
   const rig = useRef<THREE.Group>(null);
   const beacon = useRef<THREE.MeshStandardMaterial>(null);
   const fixed = robot.archetype === "robot-arm";
   const travels = moving && !fixed && verdict !== "fail";

   useFrame((_, dt) => {
      if (animate) t.current += Math.min(dt, 0.05);
      const pose = poseAt(scene, t.current, travels && scene !== "bench");
      if (rig.current) {
         rig.current.position.set(pose.x, pose.y, pose.z);
         rig.current.rotation.set(0, pose.heading, pose.pitch);
      }
      if (beacon.current) beacon.current.emissiveIntensity = verdict === "fail" ? 0.4 + Math.abs(Math.sin(t.current * 4)) : 0.8;
   });

   const beaconColour = verdict === "pass" ? p.success : verdict === "warn" ? p.lidar : p.warning;
   const sun = scene === "desert" ? 2.2 : 1.4;

   return (
      <>
         <color attach="background" args={[p.background]} />
         <hemisphereLight args={["white", "rgb(60,64,72)", 0.9]} />
         <directionalLight position={[2, 3, 1.5]} intensity={sun} color={scene === "desert" ? "rgb(255,220,170)" : "white"} />
         <Ground scene={scene} p={p} />
         <group ref={rig}>
            <Robot p={p} robot={robot} t={t} moving={verdict !== "fail" && moving} scene={scene} />
            <mesh position-y={fixed ? 0.36 : 0.34}>
               <sphereGeometry args={[0.012, 12, 8]} />
               <meshStandardMaterial ref={beacon} color={beaconColour} emissive={beaconColour} emissiveIntensity={0.8} />
            </mesh>
         </group>
      </>
   );
}

export default function LabScene(props: Props) {
   const p = usePalette();
   const { onReady } = props;
   useEffect(() => {
      if (p) onReady?.();
   }, [p, onReady]);
   if (!p) return null;
   return (
      <Canvas
         camera={{ position: [1.15, 0.85, 1.35], fov: 38, near: 0.05, far: 20 }}
         dpr={[1, 1.75]}
         frameloop={props.animate ? "always" : "demand"}
         gl={{ antialias: true, powerPreference: "low-power" }}
      >
         <World {...props} p={p} />
         <OrbitControls
            enablePan={false}
            minDistance={0.8}
            maxDistance={3}
            maxPolarAngle={Math.PI / 2.1}
            target={[0, 0.12, 0]}
            enableDamping={props.animate}
         />
      </Canvas>
   );
}
