"use client";

import { useEffect, useMemo, useState } from "react";
import type { Environment } from "../../engine/environments";

type SceneName = Environment["scene"];

export type Palette = Record<"background" | "surface" | "ink" | "muted" | "line" | "camera" | "lidar" | "fused" | "success" | "warning", string>;

/** three.js can't parse oklch, so resolve tokens to rgb() through a 1px canvas. */
function readToken(ctx: CanvasRenderingContext2D, name: string): string {
   const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
   ctx.fillStyle = "#808080";
   if (value) ctx.fillStyle = value;
   ctx.fillRect(0, 0, 1, 1);
   const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
   return `rgb(${r},${g},${b})`;
}

export function usePalette(): Palette | null {
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

export interface Pose {
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

export function poseAt(scene: SceneName, t: number, moving: boolean): Pose {
   if (scene === "table") return { x: 0, y: 0, z: 0, heading: 0, pitch: 0 };
   // Stuck robots wait at the foot of the ramp or stairs, facing them
   if (!moving) return scene === "ramp" || scene === "stairs" ? { x: -0.75, y: 0, z: 0, heading: 0, pitch: 0 } : { x: 0, y: 0, z: 0, heading: 0, pitch: 0 };
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
      // Robot fronts face local +x; a positive z-rotation lifts the front
      return { x, y, z: 0, heading: forward ? 0 : Math.PI, pitch: forward ? pitch : -pitch };
   }
   const r = scene === "track" ? 0.75 : scene === "bench" ? 0.3 : 0.5;
   const a = t * (scene === "track" ? 0.45 : 0.3);
   return { x: Math.cos(a) * r, y: 0, z: Math.sin(a) * r, heading: -a - Math.PI / 2, pitch: 0 };
}

// ─── Environment props ──────────────────────────────────────────────────────

export function Ground({ scene, p }: { scene: SceneName; p: Palette }) {
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

