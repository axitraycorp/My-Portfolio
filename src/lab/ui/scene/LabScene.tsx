"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, QuadraticBezierLine } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import type * as THREE from "three";
import type { Vec3 } from "../../assembly/frames";
import { STEP_ORDER, type Layout, type StepId } from "../../assembly/layout";
import type { Environment } from "../../engine/environments";
import type { TestVerdict } from "../../model/types";
import { Ground, poseAt, usePalette, type Palette } from "./environment";
import { Ghost, Placed, StageContext, type StageState } from "./parts";
import { DesktopArm, Dog, Hexapod, Humanoid, Rover } from "./robots";

export interface SceneWire {
   id: string;
   kind: "power" | "data" | "motor" | "invalid";
   from: Vec3;
   to: Vec3;
}

export type SceneProps = {
   layout: Layout;
   scene: Environment["scene"];
   verdict: TestVerdict;
   /** False when the environment test says the robot can't move. */
   moving: boolean;
   animate: boolean;
   /** Assembly mode: parts up to this step; the step's own parts move into place. */
   assembly?: { stage: StepId; replay: number } | null;
   wires?: SceneWire[];
   highlight?: string[];
   onReady?: () => void;
};

const WIRE_COLOURS: Record<SceneWire["kind"], string> = {
   power: "rgb(225,60,60)",
   motor: "rgb(240,170,50)",
   data: "rgb(80,170,255)",
   invalid: "rgb(255,90,200)",
};

/** Height of the robot's highest point (mm), for the beacon and camera. */
function robotHeight(layout: Layout): number {
   const geo = layout.geometry;
   if (!geo) return 150;
   const parts = layout.placements.map((p) => p.pos[1] + (p.phys.standoffMm ?? 0) + p.phys.sizeMm[2]);
   const decks = layout.decks.map((d) => d.y);
   const extra = geo.kind === "humanoid" ? 400 : geo.kind === "arm" || geo.kind === "mobile-arm" ? geo.chassis.topY + 300 : 0;
   return Math.max(geo.chassis.topY, ...parts, ...decks, extra);
}

function Robot({ layout, t, moving }: { layout: Layout; t: React.RefObject<number>; moving: boolean }) {
   const geo = layout.geometry;
   if (!geo) return <Ghost size={[220, 40, 150]} />;
   const props = { layout, t, moving };
   return (
      <group>
         {geo.kind === "arm" ? (
            <DesktopArm {...props} />
         ) : geo.kind === "dog" ? (
            <Dog {...props} />
         ) : geo.kind === "hexapod" ? (
            <Hexapod {...props} />
         ) : geo.kind === "humanoid" ? (
            <Humanoid {...props} />
         ) : (
            <Rover {...props} />
         )}
         {layout.placements.map((p) => (
            <Placed key={p.key} p={p} />
         ))}
      </group>
   );
}

function World({ layout, scene, verdict, moving, animate, assembly, wires, highlight, p }: Omit<SceneProps, "onReady"> & { p: Palette }) {
   const t = useRef(0);
   const progress = useRef(1);
   const phase = useRef(0);
   const rig = useRef<THREE.Group>(null);
   const beacon = useRef<THREE.MeshStandardMaterial>(null);
   const geo = layout.geometry;
   const fixed = geo?.kind === "arm";
   const building = Boolean(assembly);
   const travels = !building && moving && !fixed && verdict !== "fail";
   const height = robotHeight(layout);

   // Restart the fly-in whenever the step changes or is replayed
   useEffect(() => {
      phase.current = 0;
      progress.current = animate ? 0 : 1;
   }, [assembly?.stage, assembly?.replay, animate]);

   useFrame((_, dt) => {
      const step = Math.min(dt, 0.05);
      if (animate) t.current += step;
      if (building && animate) {
         phase.current += step;
         // 2.6 s to assemble, 2 s hold, then replay
         if (phase.current > 4.6) phase.current = 0;
         progress.current = Math.min(1, phase.current / 2.6);
      }
      const pose = poseAt(building ? "bench" : scene, t.current, travels && scene !== "bench");
      if (rig.current) {
         const onTable = fixed && scene === "table" && !building;
         rig.current.position.set(pose.x + (onTable ? 0.3 : 0), pose.y + (onTable ? 0.13 : 0), pose.z);
         rig.current.rotation.set(0, pose.heading, pose.pitch);
      }
      if (beacon.current) beacon.current.emissiveIntensity = verdict === "fail" ? 0.4 + Math.abs(Math.sin(t.current * 4)) : 0.8;
   });

   const ctx = useMemo<StageState>(
      () => ({
         current: assembly ? STEP_ORDER.indexOf(assembly.stage) : Infinity,
         progress,
         highlight: new Set(highlight ?? []),
         time: t,
         spinning: animate && !building,
      }),
      [assembly, highlight, animate, building],
   );

   const beaconColour = verdict === "pass" ? p.success : verdict === "warn" ? p.lidar : p.warning;
   const showWires = assembly && STEP_ORDER.indexOf(assembly.stage) >= STEP_ORDER.indexOf("wiring");

   return (
      <>
         <color attach="background" args={[p.background]} />
         <hemisphereLight args={["white", "rgb(70,74,84)", 1.5]} />
         <directionalLight position={[2, 3, 1.5]} intensity={scene === "desert" && !building ? 2.6 : 2} />
         <directionalLight position={[-2, 1.5, -1]} intensity={0.7} />
         <Ground scene={building ? "bench" : scene} p={p} />
         <group ref={rig}>
            <StageContext.Provider value={ctx}>
               <group scale={0.001}>
                  <Robot layout={layout} t={t} moving={building ? false : verdict !== "fail" && moving} />
                  {showWires &&
                     wires?.map((w) => {
                        const mid: Vec3 = [(w.from[0] + w.to[0]) / 2, Math.max(w.from[1], w.to[1]) + 35, (w.from[2] + w.to[2]) / 2];
                        return <QuadraticBezierLine key={w.id} start={w.from} end={w.to} mid={mid} color={WIRE_COLOURS[w.kind]} lineWidth={2} />;
                     })}
               </group>
            </StageContext.Provider>
            {!building && (
               <mesh position-y={(height + 60) / 1000}>
                  <sphereGeometry args={[0.012, 12, 8]} />
                  <meshStandardMaterial ref={beacon} color={beaconColour} emissive={beaconColour} emissiveIntensity={0.8} />
               </mesh>
            )}
         </group>
      </>
   );
}

export default function LabScene(props: SceneProps) {
   const p = usePalette();
   const { onReady } = props;
   useEffect(() => {
      if (p) onReady?.();
   }, [p, onReady]);
   if (!p) return null;
   const h = robotHeight(props.layout) / 1000;
   const span = Math.max(0.3, h, (props.layout.geometry?.chassis.size[0] ?? 240) / 1000);
   const d = span * 1.7 + 0.15;
   return (
      <Canvas
         camera={{ position: [d * 0.75, d * 0.6, d * 0.9], fov: 38, near: 0.02, far: 20 }}
         dpr={[1, 1.75]}
         frameloop={props.animate ? "always" : "demand"}
         gl={{ antialias: true, powerPreference: "low-power" }}
      >
         <World {...props} p={p} />
         <OrbitControls
            enablePan={false}
            minDistance={0.2}
            maxDistance={3}
            maxPolarAngle={Math.PI / 2.05}
            target={[0, h * 0.45, 0]}
            enableDamping={props.animate}
         />
      </Canvas>
   );
}
