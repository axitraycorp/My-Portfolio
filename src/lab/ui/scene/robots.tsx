"use client";

import { useFrame } from "@react-three/fiber";
import { useContext, useRef } from "react";
import type * as THREE from "three";
import type { Vec3 } from "../../assembly/frames";
import type { Layout, Placement } from "../../assembly/layout";
import { Ghost, MotorBody, ServoBody, Stage, StageContext } from "./parts";

/* Frame skeletons in mm. Actuators come from the layout, so the user's choice of
   motors and servos changes the model; empty slots show as orange outlines. */

const ALU = "rgb(168,174,186)";
const PLATE = "rgb(132,138,150)";
const DARK = "rgb(84,88,98)";

type Anim = { t: React.RefObject<number>; moving: boolean };
type RobotProps = { layout: Layout } & Anim;

function Box({ size, pos = [0, 0, 0], colour = ALU, opacity }: { size: Vec3; pos?: Vec3; colour?: string; opacity?: number }) {
   return (
      <mesh position={pos}>
         <boxGeometry args={size} />
         <meshStandardMaterial color={colour} metalness={0.45} roughness={0.5} transparent={opacity !== undefined} opacity={opacity ?? 1} />
      </mesh>
   );
}

function Post({ from, to, x, z }: { from: number; to: number; x: number; z: number }) {
   return (
      <mesh position={[x, (from + to) / 2, z]}>
         <cylinderGeometry args={[2.75, 2.75, to - from, 6]} />
         <meshStandardMaterial color="rgb(200,168,80)" metalness={0.7} roughness={0.35} />
      </mesh>
   );
}

/** Deck plates on hex standoffs; each plate appears in the step that first needs it. */
export function Decks({ layout, standoffsFrom }: { layout: Layout; standoffsFrom: number | null }) {
   const geo = layout.geometry!;
   return (
      <>
         {layout.decks.map((d, i) => {
            if (d.level === 0 && geo.kind === "arm") return null;
            const [L, W] = d.size;
            const from = d.level === 0 ? standoffsFrom : layout.decks[i - 1].y;
            const corners: [number, number][] = [
               [d.offsetX - L / 2 + 8, -W / 2 + 8],
               [d.offsetX + L / 2 - 8, -W / 2 + 8],
               [d.offsetX - L / 2 + 8, W / 2 - 8],
               [d.offsetX + L / 2 - 8, W / 2 - 8],
            ];
            return (
               <Stage key={d.level} step={d.step} lift={160}>
                  {from !== null && corners.map(([x, z]) => <Post key={`${x}${z}`} from={from} to={d.y - 3} x={x} z={z} />)}
                  <Box size={[L, 3, W]} pos={[d.offsetX, d.y - 1.5, 0]} colour={PLATE} />
               </Stage>
            );
         })}
      </>
   );
}

/** A servo at a joint, or an outline if the joint has none. */
function Joint({ servo, rot = [0, 0, 0], pos = [0, 0, 0] }: { servo: Placement | null; rot?: Vec3; pos?: Vec3 }) {
   const ctx = useContext(StageContext);
   return (
      <group position={pos} rotation={rot}>
         <Stage step="actuators" lift={70}>
            {servo ? <ServoBody ph={servo.phys} glow={ctx.highlight.has(servo.uid)} /> : <Ghost size={[40, 40, 20]} />}
         </Stage>
      </group>
   );
}

// ─── Wheeled ────────────────────────────────────────────────────────────────

function MecanumWheel({ r, hand }: { r: number; hand: 1 | -1 }) {
   return (
      <group>
         <mesh rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[r * 0.6, r * 0.6, 26, 16]} />
            <meshStandardMaterial color={DARK} metalness={0.4} />
         </mesh>
         {Array.from({ length: 10 }, (_, i) => (
            <group key={i} rotation-z={(i / 10) * Math.PI * 2}>
               <mesh position-x={r * 0.84} rotation-x={(hand * Math.PI) / 4}>
                  <cylinderGeometry args={[r * 0.16, r * 0.16, 30, 8]} />
                  <meshStandardMaterial color="rgb(70,72,78)" roughness={0.9} />
               </mesh>
            </group>
         ))}
      </group>
   );
}

function RoadWheel({ r }: { r: number }) {
   return (
      <group>
         <mesh rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[r, r, 26, 28]} />
            <meshStandardMaterial color="rgb(30,30,32)" roughness={0.95} />
         </mesh>
         <mesh rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[r * 0.55, r * 0.55, 27, 6]} />
            <meshStandardMaterial color={ALU} metalness={0.6} />
         </mesh>
      </group>
   );
}

export function Rover({ layout, t, moving }: RobotProps) {
   const geo = layout.geometry!;
   const wheels = useRef<(THREE.Group | null)[]>([]);
   const steer = useRef<(THREE.Group | null)[]>([]);
   const ctx = useContext(StageContext);
   const [CL, CW, CT] = geo.chassis.size;
   const top = geo.chassis.topY;
   const R = geo.wheelRadius;
   useFrame(() => {
      const s = moving ? t.current : 0;
      wheels.current.forEach((w) => w && (w.rotation.z = -s * 5));
      steer.current.forEach((g) => g && (g.rotation.y = moving ? Math.sin(s * 0.8) * 0.25 : 0));
   });

   const kind = geo.kind;
   const motorLen = (i: number) => layout.motors[i]?.phys.sizeMm[0] ?? 70;

   return (
      <group>
         <Stage step="frame" lift={0}>
            <Box size={[CL, CT, CW]} pos={[0, top - CT / 2, 0]} colour={PLATE} />
            {[-1, 1].map((s) => (
               <Box key={s} size={[CL * 0.9, 22, 3]} pos={[0, top - 12, (s * CW) / 2]} />
            ))}
         </Stage>

         {geo.motorAnchors.map((a, i) => {
            const m = layout.motors[i];
            return (
               <group key={i} position={a.pos} rotation-y={a.side > 0 ? 0 : Math.PI}>
                  <Stage step="actuators" lift={90}>
                     {m ? <MotorBody ph={m.phys} glow={ctx.highlight.has(m.uid)} /> : <Ghost size={[25, 25, 70]} y={-12} />}
                  </Stage>
               </group>
            );
         })}

         {(kind === "rover" || kind === "mobile-arm") &&
            geo.motorAnchors.map((a, i) => (
               <Stage key={i} step="actuators" lift={60}>
                  <group position={[a.pos[0], R, a.pos[2] + a.side * (motorLen(i) / 2 + 18)]}>
                     <group ref={(g) => void (wheels.current[i] = g)}>
                        <MecanumWheel r={R} hand={(a.pos[0] > 0) === a.side > 0 ? 1 : -1} />
                     </group>
                  </group>
               </Stage>
            ))}

         {kind === "car" && (
            <Stage step="actuators" lift={60}>
               {[
                  [105, 1],
                  [105, -1],
                  [-105, 1],
                  [-105, -1],
               ].map(([x, s], i) => (
                  <group key={i} position={[x, R, s * (CW / 2 + 16)]}>
                     <group ref={(g) => void (x > 0 && (steer.current[i] = g))}>
                        <group ref={(g) => void (wheels.current[i] = g)}>
                           <RoadWheel r={R} />
                        </group>
                     </group>
                  </group>
               ))}
            </Stage>
         )}
         {kind === "car" && <Joint servo={layout.servos[0] ?? null} pos={[115, top, 0]} />}

         {kind === "tank" && (
            <Stage step="actuators" lift={60}>
               {[-1, 1].map((s) => (
                  <group key={s} position-z={s * (CW / 2 + 22)}>
                     <Box size={[CL + 20, 6, 34]} pos={[0, R * 2 - 3, 0]} colour="rgb(36,36,38)" />
                     <Box size={[CL + 20, 6, 34]} pos={[0, 3, 0]} colour="rgb(36,36,38)" />
                     {[-1, 1].map((e) => (
                        <mesh key={e} position={[e * (CL / 2 + 10), R, 0]} rotation-x={Math.PI / 2}>
                           <cylinderGeometry args={[R, R, 34, 20]} />
                           <meshStandardMaterial color="rgb(36,36,38)" roughness={0.95} />
                        </mesh>
                     ))}
                     {[-60, -20, 20, 60].map((x, i) => (
                        <group key={x} position={[x, R, 0]}>
                           <group ref={(g) => void (wheels.current[(s > 0 ? 0 : 4) + i] = g)}>
                              <RoadWheel r={R * 0.7} />
                           </group>
                        </group>
                     ))}
                  </group>
               ))}
            </Stage>
         )}

         <Decks layout={layout} standoffsFrom={top} />
         {kind === "mobile-arm" && geo.armBase && <ArmChain layout={layout} t={t} moving={moving} base={geo.armBase} />}
      </group>
   );
}

// ─── Arm ────────────────────────────────────────────────────────────────────

function Link({ length, width }: { length: number; width: number }) {
   return (
      <Stage step="frame" lift={0}>
         {[-1, 1].map((s) => (
            <Box key={s} size={[14, length, 3]} pos={[0, length / 2, (s * (width + 6)) / 2]} />
         ))}
      </Stage>
   );
}

export function ArmChain({ layout, t, moving, base }: RobotProps & { base: Vec3 }) {
   const geo = layout.geometry!;
   const [L1, L2, L3] = geo.armLinks ?? [100, 100, 80];
   const sv = (i: number) => layout.servos[i] ?? null;
   const w = (i: number) => sv(i)?.phys.sizeMm[1] ?? 20;
   const yaw = useRef<THREE.Group>(null);
   const shoulder = useRef<THREE.Group>(null);
   const elbow = useRef<THREE.Group>(null);
   const wrist = useRef<THREE.Group>(null);
   const fingers = useRef<(THREE.Group | null)[]>([]);
   const baseH = sv(0)?.phys.sizeMm[2] ?? 40;

   useFrame(() => {
      const s = moving ? t.current : 0;
      if (yaw.current) yaw.current.rotation.y = Math.sin(s * 0.6) * 0.7;
      if (shoulder.current) shoulder.current.rotation.z = -0.35 + Math.sin(s * 0.9) * 0.25;
      if (elbow.current) elbow.current.rotation.z = -1.15 + Math.sin(s * 0.9 + 1) * 0.3;
      if (wrist.current) wrist.current.rotation.z = -0.7 + Math.sin(s * 0.9 + 2) * 0.25;
      const open = 7 + Math.max(0, Math.sin(s * 1.8)) * 8;
      fingers.current.forEach((f, i) => f && (f.position.z = (i ? 1 : -1) * open));
   });

   return (
      <group position={base}>
         <Joint servo={sv(0)} />
         <group ref={yaw} position-y={baseH + 2}>
            <Stage step="frame" lift={0}>
               <mesh position-y={4}>
                  <cylinderGeometry args={[42, 42, 8, 32]} />
                  <meshStandardMaterial color={ALU} metalness={0.5} />
               </mesh>
            </Stage>
            <Joint servo={sv(1)} pos={[0, 8, 0]} rot={[Math.PI / 2, 0, 0]} />
            <group ref={shoulder} position-y={30}>
               <Link length={L1} width={w(1)} />
               <Joint servo={sv(2)} pos={[0, L1, -10]} rot={[Math.PI / 2, 0, 0]} />
               <group ref={elbow} position-y={L1}>
                  <Link length={L2} width={w(2)} />
                  <Joint servo={sv(3)} pos={[0, L2, -10]} rot={[Math.PI / 2, 0, 0]} />
                  <group ref={wrist} position-y={L2}>
                     <Joint servo={sv(4)} pos={[0, 12, 0]} />
                     <group position-y={L3 * 0.45}>
                        <Joint servo={sv(5)} pos={[0, 0, 0]} rot={[0, 0, Math.PI / 2]} />
                        {[0, 1].map((i) => (
                           <group key={i} ref={(g) => void (fingers.current[i] = g)} position-y={L3 * 0.35}>
                              <Stage step="frame" lift={0}>
                                 <Box size={[6, L3 * 0.5, 4]} pos={[0, 0, 0]} colour={DARK} />
                              </Stage>
                           </group>
                        ))}
                     </group>
                  </group>
               </group>
            </group>
         </group>
      </group>
   );
}

export function DesktopArm({ layout, t, moving }: RobotProps) {
   const geo = layout.geometry!;
   const [CL, CT, CW] = [geo.chassis.size[0], geo.chassis.size[2], geo.chassis.size[1]];
   return (
      <group>
         <Stage step="frame" lift={0}>
            <Box size={[CL, CT, CW]} pos={[0, CT / 2, 0]} colour={PLATE} />
         </Stage>
         <ArmChain layout={layout} t={t} moving={moving} base={geo.armBase ?? [0, CT, 0]} />
      </group>
   );
}

// ─── Legged ─────────────────────────────────────────────────────────────────

export function Dog({ layout, t, moving }: RobotProps) {
   const geo = layout.geometry!;
   const [BL, BW, BH] = geo.chassis.size;
   const top = geo.chassis.topY;
   const bottom = top - BH;
   const hips = useRef<(THREE.Group | null)[]>([]);
   const knees = useRef<(THREE.Group | null)[]>([]);
   const body = useRef<THREE.Group>(null);
   const legs: { x: number; z: number; phase: number }[] = [
      { x: BL / 2 - 30, z: -1, phase: 0 },
      { x: BL / 2 - 30, z: 1, phase: Math.PI },
      { x: -BL / 2 + 30, z: -1, phase: Math.PI },
      { x: -BL / 2 + 30, z: 1, phase: 0 },
   ];
   useFrame(() => {
      const s = t.current * 6;
      legs.forEach((l, i) => {
         const swing = moving ? Math.sin(s + l.phase) * 0.3 : 0;
         const lift = moving ? Math.max(0, Math.sin(s + l.phase + Math.PI / 2)) * 0.45 : 0;
         if (hips.current[i]) hips.current[i]!.rotation.z = 0.5 + swing;
         if (knees.current[i]) knees.current[i]!.rotation.z = -1.0 - lift;
      });
      if (body.current) body.current.position.y = moving ? Math.abs(Math.sin(s)) * 3 : 0;
   });
   const sv = (i: number) => layout.servos[i] ?? null;

   return (
      <group ref={body}>
         <Stage step="frame" lift={0}>
            <Box size={[BL, 3, BW]} pos={[0, bottom + 1.5, 0]} colour={PLATE} />
            {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Box key={`${sx}${sz}`} size={[6, BH, 6]} pos={[(sx * BL) / 2 - sx * 4, bottom + BH / 2, (sz * BW) / 2 - sz * 4]} />))}
            <mesh position={[BL / 2 + 22, top - 18, 0]}>
               <boxGeometry args={[40, 34, 60]} />
               <meshStandardMaterial color={ALU} metalness={0.4} />
            </mesh>
         </Stage>
         {legs.map((l, i) => {
            const zIn = (l.z * BW) / 2 - l.z * 22;
            const zOut = l.z * (BW / 2 + (sv(i * 3 + 1)?.phys.sizeMm[1] ?? 20) / 2 + 4);
            return (
               <group key={i}>
                  <Joint servo={sv(i * 3)} pos={[l.x, bottom + 4, zIn]} />
                  <Joint servo={sv(i * 3 + 1)} pos={[l.x, bottom + 22, zOut]} rot={[(l.z * Math.PI) / 2, 0, 0]} />
                  <group position={[l.x, bottom + 4, zOut + l.z * 16]} ref={(g) => void (hips.current[i] = g)}>
                     <Stage step="frame" lift={0}>
                        <Box size={[14, 80, 8]} pos={[0, -40, 0]} />
                     </Stage>
                     <group position-y={-80} ref={(g) => void (knees.current[i] = g)}>
                        <Joint servo={sv(i * 3 + 2)} pos={[0, -8, 0]} rot={[(l.z * Math.PI) / 2, 0, 0]} />
                        <Stage step="frame" lift={0}>
                           <Box size={[10, 85, 8]} pos={[0, -42.5, 0]} colour={DARK} />
                           <mesh position-y={-86}>
                              <sphereGeometry args={[8, 12, 8]} />
                              <meshStandardMaterial color="rgb(30,30,32)" />
                           </mesh>
                        </Stage>
                     </group>
                  </group>
               </group>
            );
         })}
         <Decks layout={layout} standoffsFrom={null} />
      </group>
   );
}

export function Hexapod({ layout, t, moving }: RobotProps) {
   const geo = layout.geometry!;
   const top = geo.chassis.topY;
   const lower = top - 35;
   const coxa = useRef<(THREE.Group | null)[]>([]);
   const femur = useRef<(THREE.Group | null)[]>([]);
   const dirs: [number, number][] = [
      [0.5, -0.87],
      [0, -1],
      [-0.5, -0.87],
      [0.5, 0.87],
      [0, 1],
      [-0.5, 0.87],
   ];
   useFrame(() => {
      const s = t.current * 5;
      dirs.forEach((_, i) => {
         // Tripod gait: L1, L3 and R2 move together
         const p = i === 0 || i === 2 || i === 4 ? 0 : Math.PI;
         if (coxa.current[i]) coxa.current[i]!.rotation.y = moving ? Math.sin(s + p) * 0.3 : 0;
         if (femur.current[i]) femur.current[i]!.rotation.z = 0.35 + (moving ? Math.max(0, Math.sin(s + p + Math.PI / 2)) * 0.3 : 0);
      });
   });
   const sv = (i: number) => layout.servos[i] ?? null;
   return (
      <group>
         <Stage step="frame" lift={0}>
            <mesh position-y={lower}>
               <cylinderGeometry args={[100, 100, 3, 6]} />
               <meshStandardMaterial color={PLATE} metalness={0.4} />
            </mesh>
            {Array.from({ length: 6 }, (_, i) => {
               const a = (i / 6) * Math.PI * 2;
               return <Post key={i} from={lower} to={top - 3} x={Math.cos(a) * 80} z={Math.sin(a) * 80} />;
            })}
         </Stage>
         {dirs.map(([dx, dz], i) => (
            <group key={i} position={[dx * 95, lower + 14, dz * 95]} rotation-y={Math.atan2(-dz, dx)}>
               <Joint servo={sv(i * 3)} pos={[0, -14, 0]} />
               <group ref={(g) => void (coxa.current[i] = g)}>
                  <Stage step="frame" lift={0}>
                     <Box size={[34, 6, 24]} pos={[17, 8, 0]} />
                  </Stage>
                  <group position-x={34} ref={(g) => void (femur.current[i] = g)}>
                     <Joint servo={sv(i * 3 + 1)} pos={[0, 0, 0]} rot={[Math.PI / 2, 0, 0]} />
                     <Stage step="frame" lift={0}>
                        <Box size={[60, 6, 26]} pos={[30, 0, 0]} />
                     </Stage>
                     <group position-x={60} rotation-z={-1.62}>
                        <Joint servo={sv(i * 3 + 2)} pos={[0, 0, 0]} rot={[Math.PI / 2, 0, 0]} />
                        <Stage step="frame" lift={0}>
                           <Box size={[140, 7, 10]} pos={[70, 0, 0]} colour={DARK} />
                        </Stage>
                     </group>
                  </group>
               </group>
            </group>
         ))}
         <Decks layout={layout} standoffsFrom={null} />
      </group>
   );
}

export function Humanoid({ layout, t, moving }: RobotProps) {
   const geo = layout.geometry!;
   const [TD, TW, TH] = geo.chassis.size;
   const top = geo.chassis.topY;
   const limbs = useRef<(THREE.Group | null)[]>([]);
   const knees = useRef<(THREE.Group | null)[]>([]);
   useFrame(() => {
      const s = t.current * 4;
      const swing = moving ? Math.sin(s) * 0.35 : 0;
      const [la, ra, ll, rl] = limbs.current;
      if (la) la.rotation.z = -swing;
      if (ra) ra.rotation.z = swing;
      if (ll) ll.rotation.z = swing;
      if (rl) rl.rotation.z = -swing;
      knees.current.forEach((k, i) => k && (k.rotation.z = moving ? -Math.max(0, Math.sin(s + (i ? Math.PI : 0))) * 0.6 : 0));
   });
   const sv = (i: number) => layout.servos[i] ?? null;
   const side = (s: number) => (s < 0 ? 0 : 1);

   return (
      <group>
         <Stage step="frame" lift={0}>
            <Box size={[TD, TH, TW]} pos={[0, top - TH / 2, 0]} opacity={0.35} />
            <Box size={[50, 55, 60]} pos={[0, top + 40, 0]} />
         </Stage>
         <Joint servo={sv(0)} pos={[0, top + 2, 0]} rot={[0, 0, 0]} />
         {[-1, 1].map((s) => {
            const b = 1 + side(s) * 3;
            return (
               <group key={`arm${s}`} position={[0, top - 18, s * (TW / 2 + 14)]}>
                  <Joint servo={sv(b)} rot={[(s * Math.PI) / 2, 0, 0]} pos={[0, 0, 0]} />
                  <group ref={(g) => void (limbs.current[side(s)] = g)}>
                     <Joint servo={sv(b + 1)} pos={[0, -50, s * 6]} rot={[0, 0, 0]} />
                     <Stage step="frame" lift={0}>
                        <Box size={[16, 70, 6]} pos={[0, -45, s * 14]} />
                     </Stage>
                     <Joint servo={sv(b + 2)} pos={[0, -120, s * 6]} />
                     <Stage step="frame" lift={0}>
                        <Box size={[14, 60, 6]} pos={[0, -125, s * 14]} colour={DARK} />
                     </Stage>
                  </group>
               </group>
            );
         })}
         {[-1, 1].map((s) => {
            const b = 7 + side(s) * 5;
            const hipY = top - TH - 5;
            return (
               <group key={`leg${s}`} position={[0, hipY, s * 38]}>
                  <Joint servo={sv(b)} pos={[0, -2, 0]} rot={[Math.PI, 0, 0]} />
                  <Joint servo={sv(b + 1)} pos={[0, -50, 0]} rot={[0, Math.PI / 2, Math.PI]} />
                  <group position-y={-55} ref={(g) => void (limbs.current[2 + side(s)] = g)}>
                     <Joint servo={sv(b + 2)} pos={[0, -2, s * 12]} rot={[(s * Math.PI) / 2, 0, 0]} />
                     <Stage step="frame" lift={0}>
                        <Box size={[18, 60, 6]} pos={[0, -32, s * 26]} />
                     </Stage>
                     <group position-y={-62} ref={(g) => void (knees.current[side(s)] = g)}>
                        <Joint servo={sv(b + 3)} pos={[0, 0, s * 12]} rot={[(s * Math.PI) / 2, 0, 0]} />
                        <Stage step="frame" lift={0}>
                           <Box size={[16, 55, 6]} pos={[0, -30, s * 26]} colour={DARK} />
                        </Stage>
                        <Joint servo={sv(b + 4)} pos={[0, -62, s * 12]} rot={[(s * Math.PI) / 2, 0, 0]} />
                        <Stage step="frame" lift={0}>
                           <Box size={[80, 6, 46]} pos={[10, -72, 0]} colour={DARK} />
                        </Stage>
                     </group>
                  </group>
               </group>
            );
         })}
         <Decks layout={layout} standoffsFrom={null} />
      </group>
   );
}
