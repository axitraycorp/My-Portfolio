"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Palette = Record<
   "background" | "camera" | "radar" | "fused" | "ink" | "line" | "surface",
   string
>;

/** Resolves a CSS colour token (oklch) to rgb() via a 1px canvas, since three.js can't parse oklch. */
function readToken(name: string): string {
   const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
   const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
   if (!ctx || !value) return "rgb(128,128,128)";
   ctx.fillStyle = "#808080";
   ctx.fillStyle = value;
   ctx.fillRect(0, 0, 1, 1);
   const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
   return `rgb(${r},${g},${b})`;
}

function readPalette(): Palette {
   return {
      background: readToken("--background"),
      camera: readToken("--camera"),
      radar: readToken("--radar"),
      fused: readToken("--fused"),
      ink: readToken("--ink"),
      line: readToken("--line"),
      surface: readToken("--surface-raised"),
   };
}

/** Palette that updates when the theme attribute changes. */
function usePalette(): Palette {
   const [palette, setPalette] = useState(readPalette);
   useEffect(() => {
      const observer = new MutationObserver(() => setPalette(readPalette()));
      observer.observe(document.documentElement, {
         attributes: true,
         attributeFilter: ["data-theme"],
      });
      return () => observer.disconnect();
   }, []);
   return palette;
}

// Joint angles: [base yaw, shoulder, elbow, wrist] in radians
const POSES: [number, number, number, number][] = [
   [0.25, -0.45, -1.15, -0.65],
   [-0.35, -0.8, -0.85, -0.85],
   [0.05, -0.3, -1.45, -0.45],
   [0.55, -0.7, -0.75, -0.95],
];
const POSE_SECONDS = 3.2;

const smooth = (t: number) => t * t * (3 - 2 * t);

function Arm({ palette, followPointer }: { palette: Palette; followPointer: boolean }) {
   const yaw = useRef<THREE.Group>(null);
   const shoulder = useRef<THREE.Group>(null);
   const elbow = useRef<THREE.Group>(null);
   const wrist = useRef<THREE.Group>(null);
   const pointerX = useRef(0);
   const follow = useRef(0);

   useEffect(() => {
      if (!followPointer) return;
      const onMove = (e: PointerEvent) => {
         pointerX.current = (e.clientX / window.innerWidth) * 2 - 1;
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      return () => window.removeEventListener("pointermove", onMove);
   }, [followPointer]);

   useFrame(({ clock }, delta) => {
      const t = clock.elapsedTime / POSE_SECONDS;
      const from = POSES[Math.floor(t) % POSES.length];
      const to = POSES[(Math.floor(t) + 1) % POSES.length];
      const k = smooth(t % 1);
      const pose = from.map((a, i) => a + (to[i] - a) * k);
      // Ease toward the cursor: a subtle turn, not a tracking turret
      follow.current += (-pointerX.current * 0.35 - follow.current) * Math.min(1, delta * 2.5);
      if (yaw.current) yaw.current.rotation.y = pose[0] + follow.current;
      if (shoulder.current) shoulder.current.rotation.z = pose[1];
      if (elbow.current) elbow.current.rotation.z = pose[2];
      if (wrist.current) wrist.current.rotation.z = pose[3];
   });

   const body = <meshStandardMaterial color={palette.surface} roughness={0.55} metalness={0.25} />;
   const joint = <meshStandardMaterial color={palette.ink} roughness={0.4} metalness={0.4} />;

   return (
      <group>
         <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.38, 0.42, 0.2, 24]} />
            {body}
         </mesh>
         <group ref={yaw} position={[0, 0.2, 0]}>
            <mesh position={[0, 0.18, 0]}>
               <cylinderGeometry args={[0.13, 0.15, 0.36, 16]} />
               {body}
            </mesh>
            <group ref={shoulder} position={[0, 0.38, 0]}>
               <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.12, 0.12, 0.3, 16]} />
                  {joint}
               </mesh>
               <mesh position={[0, 0.55, 0]}>
                  <boxGeometry args={[0.16, 1.1, 0.16]} />
                  {body}
               </mesh>
               <group ref={elbow} position={[0, 1.1, 0]}>
                  <mesh rotation={[Math.PI / 2, 0, 0]}>
                     <cylinderGeometry args={[0.1, 0.1, 0.26, 16]} />
                     {joint}
                  </mesh>
                  <mesh position={[0, 0.45, 0]}>
                     <boxGeometry args={[0.13, 0.9, 0.13]} />
                     {body}
                  </mesh>
                  <group ref={wrist} position={[0, 0.9, 0]}>
                     <mesh>
                        <sphereGeometry args={[0.08, 16, 12]} />
                        {joint}
                     </mesh>
                     <mesh position={[0, 0.12, 0]}>
                        <boxGeometry args={[0.22, 0.06, 0.1]} />
                        {body}
                     </mesh>
                     <mesh position={[-0.08, 0.24, 0]}>
                        <boxGeometry args={[0.035, 0.2, 0.08]} />
                        {joint}
                     </mesh>
                     <mesh position={[0.08, 0.24, 0]}>
                        <boxGeometry args={[0.035, 0.2, 0.08]} />
                        {joint}
                     </mesh>
                  </group>
               </group>
            </group>
         </group>
      </group>
   );
}

/** Cyan camera frustum attached to the base, looking along +x. */
function CameraFrustum({ color }: { color: string }) {
   const geometry = useMemo(() => {
      const g = new THREE.ConeGeometry(1.15, 2.6, 4, 1, true);
      g.rotateY(Math.PI / 4);
      g.rotateZ(Math.PI / 2); // apex toward -x, opening toward +x
      g.translate(1.3, 0, 0);
      return g;
   }, []);
   const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);
   return (
      <group position={[0.4, 0.32, 0]} rotation={[0, 0, -0.14]}>
         <mesh geometry={geometry}>
            <meshBasicMaterial
               color={color}
               transparent
               opacity={0.07}
               side={THREE.DoubleSide}
               depthWrite={false}
            />
         </mesh>
         <lineSegments geometry={edges}>
            <lineBasicMaterial color={color} transparent opacity={0.85} />
         </lineSegments>
      </group>
   );
}

const RADAR_RANGE = 2.8;
const RADAR_HALF_FOV = 0.85;

/** Amber radar sector on the floor with a sweeping beam. */
function RadarSweep({ color, animate }: { color: string; animate: boolean }) {
   const beam = useRef<THREE.Group>(null);
   useFrame(({ clock }) => {
      if (animate && beam.current)
         beam.current.rotation.y = Math.sin(clock.elapsedTime * 1.4) * RADAR_HALF_FOV;
   });
   const beamGeometry = useMemo(
      () =>
         new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(RADAR_RANGE, 0, 0),
         ]),
      []
   );
   return (
      <group position={[0.2, 0.012, 0]}>
         <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[RADAR_RANGE, 40, -RADAR_HALF_FOV, RADAR_HALF_FOV * 2]} />
            <meshBasicMaterial
               color={color}
               transparent
               opacity={0.09}
               depthWrite={false}
               side={THREE.DoubleSide}
            />
         </mesh>
         {[1.0, 1.9, RADAR_RANGE].map((r) => (
            <mesh key={r} rotation={[-Math.PI / 2, 0, 0]}>
               <ringGeometry
                  args={[r - 0.008, r + 0.008, 48, 1, -RADAR_HALF_FOV, RADAR_HALF_FOV * 2]}
               />
               <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={0.45}
                  depthWrite={false}
                  side={THREE.DoubleSide}
               />
            </mesh>
         ))}
         <group ref={beam}>
            <lineSegments geometry={beamGeometry}>
               <lineBasicMaterial color={color} />
            </lineSegments>
         </group>
      </group>
   );
}

type Detection = {
   label: string;
   shape: "cup" | "box" | "ball";
   position: [number, number, number];
   size: [number, number, number];
   phase: number;
};

// Illustrative detections for the hero scene (not measured results)
const DETECTIONS: Detection[] = [
   {
      label: "cup 0.91 · 0.82 m",
      shape: "cup",
      position: [1.9, 0.32, 0.65],
      size: [0.34, 0.42, 0.34],
      phase: 0,
   },
   {
      label: "box 0.87 · 1.10 m",
      shape: "box",
      position: [2.0, 0.28, -0.35],
      size: [0.46, 0.36, 0.4],
      phase: 1.7,
   },
   {
      label: "ball 0.79 · 0.95 m",
      shape: "ball",
      position: [1.45, 0.3, -0.15],
      size: [0.32, 0.32, 0.32],
      phase: 3.1,
   },
];

function DetectedObject({
   det,
   palette,
   animate,
}: {
   det: Detection;
   palette: Palette;
   animate: boolean;
}) {
   const group = useRef<THREE.Group>(null);
   useFrame(({ clock }) => {
      if (animate && group.current)
         group.current.position.y =
            det.position[1] + Math.sin(clock.elapsedTime * 0.9 + det.phase) * 0.05;
   });
   const [w, h, d] = det.size;
   const boxEdges = useMemo(
      () => new THREE.EdgesGeometry(new THREE.BoxGeometry(w * 1.25, h * 1.25, d * 1.25)),
      [w, h, d]
   );
   return (
      <group ref={group} position={det.position}>
         <mesh>
            {det.shape === "cup" && <cylinderGeometry args={[w / 2, w / 2.6, h, 20]} />}
            {det.shape === "box" && <boxGeometry args={[w, h, d]} />}
            {det.shape === "ball" && <sphereGeometry args={[w / 2, 20, 16]} />}
            <meshStandardMaterial color={palette.surface} roughness={0.6} />
         </mesh>
         <lineSegments geometry={boxEdges}>
            <lineBasicMaterial color={palette.fused} />
         </lineSegments>
         <Html
            position={[-w * 0.62, h * 0.62 + 0.02, d * 0.62]}
            zIndexRange={[5, 0]}
            style={{ pointerEvents: "none" }}
         >
            <span className="scene-label">{det.label}</span>
         </Html>
      </group>
   );
}

function LookAt({ target }: { target: [number, number, number] }) {
   const camera = useThree((s) => s.camera);
   useEffect(() => camera.lookAt(...target), [camera, target]);
   return null;
}

/** Renders at ~30 fps in low-power mode instead of every display frame. */
function Throttle({ fps, active }: { fps: number; active: boolean }) {
   const invalidate = useThree((s) => s.invalidate);
   useEffect(() => {
      if (!active) return;
      const id = window.setInterval(() => invalidate(), 1000 / fps);
      return () => window.clearInterval(id);
   }, [active, fps, invalidate]);
   return null;
}

const LOOK_TARGET: [number, number, number] = [1.05, 0.55, -0.1];

export default function RobotScene({
   paused,
   lowPower,
   onReady,
}: {
   paused: boolean;
   lowPower: boolean;
   onReady: () => void;
}) {
   const palette = usePalette();
   const detections = lowPower ? DETECTIONS.slice(0, 2) : DETECTIONS;
   const frameloop = paused ? "never" : lowPower ? "demand" : "always";

   return (
      <Canvas
         aria-hidden="true"
         frameloop={frameloop}
         dpr={lowPower ? 1 : [1, 1.75]}
         gl={{
            antialias: !lowPower,
            alpha: false,
            powerPreference: lowPower ? "low-power" : "high-performance",
         }}
         camera={{ position: [4.1, 2.3, 3.5], fov: 40 }}
         onCreated={({ gl }) => {
            gl.setClearColor(palette.background);
            onReady();
         }}
      >
         <color attach="background" args={[palette.background]} />
         <LookAt target={LOOK_TARGET} />
         <Throttle fps={30} active={lowPower && !paused} />
         <ambientLight intensity={0.55} />
         <directionalLight position={[3, 5, 2]} intensity={1.4} />
         <directionalLight position={[-3, 2, -2]} intensity={0.4} color={palette.camera} />
         <gridHelper args={[10, 20, palette.line, palette.line]} />
         <RadarSweep color={palette.radar} animate />
         <CameraFrustum color={palette.camera} />
         <Arm palette={palette} followPointer={!lowPower} />
         {detections.map((det) => (
            <DetectedObject key={det.label} det={det} palette={palette} animate />
         ))}
      </Canvas>
   );
}
