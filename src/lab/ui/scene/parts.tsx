"use client";

import { useFrame } from "@react-three/fiber";
import { createContext, useContext, useRef } from "react";
import type * as THREE from "three";
import { STEP_ORDER, type Placement, type StepId } from "../../assembly/layout";
import type { Physical } from "../../model/physical";

/* Everything here is in millimetres; the robot root group scales by 0.001. */

export interface StageState {
   /** Index into STEP_ORDER of the step being assembled; Infinity = fully built. */
   current: number;
   /** 0 → 1 while the current step's parts move into place. */
   progress: React.RefObject<number>;
   /** Parts that should glow (from a highlighted issue). */
   highlight: Set<string>;
   /** Seconds since start, for spinning fans and LiDAR. */
   time: React.RefObject<number>;
   spinning: boolean;
}

export const StageContext = createContext<StageState>({
   current: Infinity,
   progress: { current: 1 },
   highlight: new Set(),
   time: { current: 0 },
   spinning: false,
});

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/**
 * Hides parts from later steps; parts of the current step start lifted and
 * apart (exploded) and move into place as the step plays.
 */
export function Stage({ step, lift = 120, children }: { step: StepId; lift?: number; children: React.ReactNode }) {
   const ctx = useContext(StageContext);
   const ref = useRef<THREE.Group>(null);
   const idx = STEP_ORDER.indexOf(step);
   useFrame(() => {
      if (!ref.current) return;
      const p = idx === ctx.current ? ease(ctx.progress.current / 0.6) : 1;
      ref.current.position.y = (1 - p) * lift;
   });
   if (idx > ctx.current) return null;
   return <group ref={ref}>{children}</group>;
}

/** Screws drop in after their part has landed. */
function Screws({ ph, y, step }: { ph: Physical; y: number; step: StepId }) {
   const ctx = useContext(StageContext);
   const ref = useRef<THREE.Group>(null);
   const idx = STEP_ORDER.indexOf(step);
   useFrame(() => {
      if (!ref.current) return;
      const p = idx === ctx.current ? ease((ctx.progress.current - 0.6) / 0.35) : 1;
      ref.current.position.y = (1 - p) * 40;
      ref.current.visible = idx !== ctx.current || ctx.progress.current > 0.55;
   });
   if (!ph.screw || ph.holes.length === 0 || ph.screw === "1/4-20") return null;
   const d = ph.screw === "M3" ? 3 : ph.screw === "M2.5" ? 2.5 : 2;
   return (
      <group ref={ref}>
         {ph.holes.map(([x, z], i) => (
            <group key={i} position={[x, y, z]}>
               <mesh position-y={d * 0.35}>
                  <cylinderGeometry args={[d * 0.9, d * 0.9, d * 0.7, 12]} />
                  <meshStandardMaterial color="rgb(170,174,182)" metalness={0.8} roughness={0.3} />
               </mesh>
               <mesh position-y={d * 0.72}>
                  <boxGeometry args={[d * 1.1, d * 0.12, d * 0.25]} />
                  <meshStandardMaterial color="rgb(40,40,44)" />
               </mesh>
            </group>
         ))}
      </group>
   );
}

function Standoffs({ ph }: { ph: Physical }) {
   if (!ph.standoffMm || ph.holes.length === 0) return null;
   const r = ph.screw === "M3" ? 2.75 : ph.screw === "M2.5" ? 2.5 : 2;
   return (
      <group>
         {ph.holes.map(([x, z], i) => (
            <mesh key={i} position={[x, ph.standoffMm! / 2, z]}>
               <cylinderGeometry args={[r, r, ph.standoffMm!, 6]} />
               <meshStandardMaterial color="rgb(200,168,80)" metalness={0.7} roughness={0.35} />
            </mesh>
         ))}
      </group>
   );
}

function Spinner({ children, speed }: { children: React.ReactNode; speed: number }) {
   const ctx = useContext(StageContext);
   const ref = useRef<THREE.Group>(null);
   useFrame(() => {
      if (ref.current && ctx.spinning) ref.current.rotation.y = ctx.time.current * speed;
   });
   return <group ref={ref}>{children}</group>;
}

function mat(colour: string, glow: boolean, extra: Partial<{ metalness: number; roughness: number }> = {}) {
   return (
      <meshStandardMaterial
         color={colour}
         emissive={glow ? "rgb(60,200,230)" : "black"}
         emissiveIntensity={glow ? 0.55 : 0}
         metalness={extra.metalness ?? 0.15}
         roughness={extra.roughness ?? 0.6}
      />
   );
}

/** The body of a part in its own frame: origin at the centre of its mounting face. */
export function PartBody({ ph, glow = false, front = false }: { ph: Physical; glow?: boolean; front?: boolean }) {
   const [L, W, H] = ph.sizeMm;
   const base = ph.standoffMm ?? 0;
   switch (ph.shape) {
      case "board":
      case "module": {
         const sink = H > 25;
         const body = (
            <group>
               <mesh position-y={base + 0.8}>
                  <boxGeometry args={[L, 1.6, W]} />
                  {mat(ph.colour, glow)}
               </mesh>
               <mesh position={[0, base + 1.6 + (H - 1.6) / 2, 0]}>
                  <boxGeometry args={[L * (sink ? 0.8 : 0.62), H - 1.6, W * (sink ? 0.85 : 0.55)]} />
                  {mat(sink ? "rgb(40,42,46)" : "rgb(58,60,66)", false, { metalness: sink ? 0.6 : 0.2 })}
               </mesh>
               {L > 60 && (
                  <mesh position={[0, base + 4, -W / 2 + 4]}>
                     <boxGeometry args={[L * 0.7, 5, 5]} />
                     {mat("rgb(25,25,28)", false)}
                  </mesh>
               )}
            </group>
         );
         return (
            <group rotation-x={front ? -Math.PI / 2 : 0}>
               <Standoffs ph={ph} />
               {body}
            </group>
         );
      }
      case "battery":
         return (
            <group>
               <mesh position-y={H / 2}>
                  <boxGeometry args={[L, H, W]} />
                  {mat(ph.colour, glow)}
               </mesh>
               <mesh position={[L * 0.05, H + 0.3, 0]}>
                  <boxGeometry args={[L * 0.6, 0.6, W * 0.6]} />
                  {mat("rgb(220,220,225)", false)}
               </mesh>
               {[-3, 3].map((z, i) => (
                  <mesh key={z} position={[L / 2 + 12, H * 0.6, z]} rotation-z={Math.PI / 2}>
                     <cylinderGeometry args={[1.6, 1.6, 24, 6]} />
                     {mat(i ? "rgb(30,30,30)" : "rgb(210,50,50)", false)}
                  </mesh>
               ))}
            </group>
         );
      case "fan":
         return (
            <group>
               <mesh position-y={H / 2}>
                  <boxGeometry args={[L, H * 0.7, W]} />
                  {mat(ph.colour, glow, { metalness: 0.6, roughness: 0.4 })}
               </mesh>
               <Spinner speed={18}>
                  <mesh position-y={H * 0.9}>
                     <cylinderGeometry args={[Math.min(L, W) * 0.4, Math.min(L, W) * 0.4, H * 0.2, 7]} />
                     {mat("rgb(30,30,34)", false)}
                  </mesh>
               </Spinner>
            </group>
         );
      case "puck":
         return (
            <group>
               <Standoffs ph={ph} />
               <mesh position-y={base + H * 0.35}>
                  <cylinderGeometry args={[L / 2, L / 2, H * 0.7, 32]} />
                  {mat(ph.colour, glow)}
               </mesh>
               <Spinner speed={6}>
                  <mesh position-y={base + H * 0.85}>
                     <cylinderGeometry args={[L * 0.38, L * 0.42, H * 0.3, 32]} />
                     {mat("rgb(30,30,34)", false)}
                  </mesh>
                  <mesh position={[L * 0.38, base + H * 0.85, 0]}>
                     <boxGeometry args={[3, H * 0.2, 10]} />
                     <meshStandardMaterial color="rgb(255,190,80)" emissive="rgb(255,170,40)" emissiveIntensity={0.8} />
                  </mesh>
               </Spinner>
            </group>
         );
      case "camera":
      case "sonar":
         return (
            <group>
               <Standoffs ph={ph} />
               <mesh position-y={base + H / 2}>
                  <boxGeometry args={[L, H, ph.shape === "sonar" ? 2 : W]} />
                  {mat(ph.colour, glow)}
               </mesh>
               {(ph.shape === "sonar" ? [-0.25, 0.25] : L > 50 ? [-0.3, 0.3] : [0]).map((f) => (
                  <mesh key={f} position={[L * f, base + H / 2, (ph.shape === "sonar" ? 1 : W / 2) + 2]} rotation-x={Math.PI / 2}>
                     <cylinderGeometry args={[ph.shape === "sonar" ? 8 : Math.min(H, 20) * 0.25, ph.shape === "sonar" ? 8 : Math.min(H, 20) * 0.25, ph.shape === "sonar" ? 12 : 4, 20]} />
                     <meshStandardMaterial
                        color={ph.shape === "sonar" ? "rgb(200,200,204)" : "rgb(90,210,235)"}
                        emissive={ph.shape === "sonar" ? "black" : "rgb(60,190,220)"}
                        emissiveIntensity={0.5}
                     />
                  </mesh>
               ))}
            </group>
         );
      case "switch":
         return (
            <group>
               <mesh position-y={H / 2}>
                  <boxGeometry args={[L * 0.45, H, W]} />
                  {mat("rgb(40,40,44)", glow)}
               </mesh>
               <mesh position={[0, H + 2, 0]} rotation-z={0.25}>
                  <boxGeometry args={[L * 0.3, 5, W * 0.7]} />
                  {mat(ph.colour, glow)}
               </mesh>
               <mesh position={[L * 0.35, 8, 0]}>
                  <boxGeometry args={[18, 16, 10]} />
                  {mat("rgb(40,40,44)", false)}
               </mesh>
            </group>
         );
      case "servo":
         return <ServoBody ph={ph} glow={glow} />;
      case "motor":
         return <MotorBody ph={ph} glow={glow} />;
      default:
         return (
            <mesh position-y={H / 2}>
               <boxGeometry args={[L, H, W]} />
               {mat(ph.colour, glow)}
            </mesh>
         );
   }
}

/** Servo standing on its mounting face; output shaft on top at −x. */
export function ServoBody({ ph, glow = false }: { ph: Physical; glow?: boolean }) {
   const [L, W, H] = ph.sizeMm;
   const tab = Math.max(...ph.holes.map(([x]) => Math.abs(x)), L / 2) + 4;
   return (
      <group>
         <mesh position-y={(H * 0.85) / 2}>
            <boxGeometry args={[L, H * 0.85, W]} />
            {mat(ph.colour, glow)}
         </mesh>
         <mesh position-y={H * 0.62}>
            <boxGeometry args={[tab * 2, 2.5, W]} />
            {mat(ph.colour, glow)}
         </mesh>
         <mesh position={[-L * 0.25, H * 0.925, 0]}>
            <cylinderGeometry args={[W * 0.42, W * 0.42, H * 0.15, 20]} />
            {mat("rgb(225,225,230)", false, { metalness: 0.5 })}
         </mesh>
      </group>
   );
}

/** Gear motor lying along +z (shaft end), centred on its anchor. */
export function MotorBody({ ph, glow = false }: { ph: Physical; glow?: boolean }) {
   const [L, D] = ph.sizeMm;
   const round = ph.mountClass !== "tt";
   return (
      <group>
         <mesh position-z={L * 0.22}>
            <boxGeometry args={[D, ph.sizeMm[2], L * 0.45]} />
            {mat(ph.colour, glow, { metalness: 0.4 })}
         </mesh>
         {round && (
            <mesh position-z={-L * 0.22} rotation-x={Math.PI / 2}>
               <cylinderGeometry args={[D * 0.46, D * 0.46, L * 0.55, 20]} />
               {mat("rgb(175,178,186)", glow, { metalness: 0.7, roughness: 0.35 })}
            </mesh>
         )}
         <mesh position-z={L * 0.5 + 6} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[2.5, 2.5, 12, 10]} />
            {mat("rgb(200,200,206)", false, { metalness: 0.8 })}
         </mesh>
      </group>
   );
}

/** Transparent outline where a missing part should go. */
export function Ghost({ size, y = 0 }: { size: [number, number, number]; y?: number }) {
   return (
      <mesh position-y={y + size[1] / 2}>
         <boxGeometry args={size} />
         <meshBasicMaterial color="rgb(255,120,80)" wireframe transparent opacity={0.7} />
      </mesh>
   );
}

/** A placed part (deck, bay, front, top, stack, ground zones). */
export function Placed({ p }: { p: Placement }) {
   const ctx = useContext(StageContext);
   const glow = ctx.highlight.has(p.uid);
   const front = p.zone === "front" && (p.phys.shape === "board" || p.phys.shape === "module");
   const top = (p.phys.standoffMm ?? 0) + 1.6;
   return (
      <Stage step={p.step} lift={p.zone === "bay" ? 90 : 140}>
         <group position={p.pos} rotation-y={p.rotY}>
            <PartBody ph={p.phys} glow={glow} front={front} />
            {!front && (p.phys.method === "standoffs" || p.phys.method === "carrier" || p.phys.method === "stack") && (
               <Screws ph={p.phys} y={top} step={p.step} />
            )}
         </group>
      </Stage>
   );
}
