"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Palette = Record<
   "background" | "camera" | "lidar" | "fused" | "ink" | "line" | "surface",
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
      lidar: readToken("--lidar"),
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

/*
 * Geometry follows the real robot's drawing, at 1 unit = 100 mm:
 * 212 mm chassis, 65 mm mecanum wheels, arm links 74 / 74 / 140 mm,
 * first arm joint 152 mm above the floor. +x is the robot's front.
 */
const WHEEL_R = 0.325;
const DECK_Y = 0.71;
const TURRET_X = 0.45;
const SHOULDER_Y = 1.52;
const LINK_1 = 0.74;
const LINK_2 = 0.74;
const LINK_3 = 1.4;
const LIDAR_POS: [number, number, number] = [0.86, DECK_Y + 0.1, 0];

// Joint angles: [turret yaw, shoulder, elbow, wrist] in radians
const POSES: [number, number, number, number][] = [
   [0.15, -0.9, -0.9, -0.9],
   [-0.3, -0.3, -0.6, -0.5],
   [0.35, -0.7, -1.3, -0.4],
   [-0.1, -0.5, -0.9, -1.0],
];
const POSE_SECONDS = 3.2;

const smooth = (t: number) => t * t * (3 - 2 * t);

function Material({ color, metal = 0.3 }: { color: string; metal?: number }) {
   return <meshStandardMaterial color={color} roughness={0.55} metalness={metal} />;
}

/** Mecanum chassis: lower body, four spinning wheels, rear electronics deck (Jetson) and LiDAR. */
function Chassis({ palette, animate }: { palette: Palette; animate: boolean }) {
   const wheels: [number, number][] = [
      [0.68, 0.67],
      [0.68, -0.67],
      [-0.68, 0.67],
      [-0.68, -0.67],
   ];
   const spinners = useRef<(THREE.Group | null)[]>([]);
   useFrame((_, delta) => {
      if (!animate) return;
      for (const s of spinners.current) if (s) s.rotation.y += delta * 2.4;
   });
   return (
      <group>
         <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[2.0, 0.5, 1.0]} />
            <Material color={palette.surface} />
         </mesh>
         <mesh position={[0, DECK_Y - 0.02, 0]}>
            <boxGeometry args={[2.08, 0.04, 1.06]} />
            <Material color={palette.ink} metal={0.5} />
         </mesh>
         {/* rear electronics deck: where the Jetson Orin Nano sits */}
         <mesh position={[-0.55, DECK_Y + 0.3, 0]}>
            <boxGeometry args={[0.9, 0.58, 0.9]} />
            <Material color={palette.surface} />
         </mesh>
         <mesh position={[-0.55, DECK_Y + 0.3, 0.452]}>
            <planeGeometry args={[0.5, 0.18]} />
            <meshBasicMaterial color={palette.fused} transparent opacity={0.8} />
         </mesh>
         {wheels.map(([x, z], i) => (
            <group key={`${x}${z}`} position={[x, WHEEL_R, z]} rotation={[Math.PI / 2, 0, 0]}>
               <group
                  ref={(el) => {
                     spinners.current[i] = el;
                  }}
               >
                  <mesh>
                     <cylinderGeometry args={[WHEEL_R, WHEEL_R, 0.3, 20]} />
                     <Material color={palette.ink} metal={0.2} />
                  </mesh>
                  <mesh>
                     <cylinderGeometry args={[WHEEL_R * 0.55, WHEEL_R * 0.55, 0.31, 16]} />
                     <Material color={palette.surface} metal={0.6} />
                  </mesh>
                  {/* hub spoke so the spin is visible */}
                  <mesh>
                     <boxGeometry args={[WHEEL_R * 1.6, 0.32, 0.06]} />
                     <Material color={palette.line} metal={0.4} />
                  </mesh>
               </group>
            </group>
         ))}
         {/* TOF LiDAR */}
         <mesh position={LIDAR_POS}>
            <cylinderGeometry args={[0.15, 0.17, 0.18, 20]} />
            <Material color={palette.ink} metal={0.4} />
         </mesh>
         <mesh position={[LIDAR_POS[0], LIDAR_POS[1] + 0.03, LIDAR_POS[2]]}>
            <cylinderGeometry args={[0.152, 0.152, 0.03, 20]} />
            <meshBasicMaterial color={palette.lidar} />
         </mesh>
      </group>
   );
}

/** Cyan depth-camera frustum, opening along the wrist's +y. */
function CameraFrustum({ color }: { color: string }) {
   const geometry = useMemo(() => {
      const g = new THREE.ConeGeometry(0.85, 2.2, 4, 1, true);
      g.rotateY(Math.PI / 4);
      g.rotateX(Math.PI); // apex down (at the camera), opening up along +y
      g.translate(0, 1.1, 0);
      return g;
   }, []);
   const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);
   return (
      <group>
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
            <lineBasicMaterial color={color} transparent opacity={0.8} />
         </lineSegments>
      </group>
   );
}

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

   const body = <Material color={palette.surface} />;
   const servo = <Material color={palette.ink} metal={0.45} />;
   const turretTop = DECK_Y + 0.22;

   return (
      <group position={[TURRET_X, 0, 0]}>
         <mesh position={[0, DECK_Y + 0.11, 0]}>
            <cylinderGeometry args={[0.36, 0.4, 0.22, 28]} />
            {body}
         </mesh>
         <group ref={yaw} position={[0, turretTop, 0]}>
            <mesh position={[0, (SHOULDER_Y - turretTop) / 2, 0]}>
               <boxGeometry args={[0.36, SHOULDER_Y - turretTop, 0.36]} />
               {servo}
            </mesh>
            <group ref={shoulder} position={[0, SHOULDER_Y - turretTop, 0]}>
               <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.14, 0.14, 0.42, 16]} />
                  {servo}
               </mesh>
               <mesh position={[0, LINK_1 / 2, 0]}>
                  <boxGeometry args={[0.3, LINK_1, 0.3]} />
                  {body}
               </mesh>
               <group ref={elbow} position={[0, LINK_1, 0]}>
                  <mesh rotation={[Math.PI / 2, 0, 0]}>
                     <cylinderGeometry args={[0.13, 0.13, 0.38, 16]} />
                     {servo}
                  </mesh>
                  <mesh position={[0, LINK_2 / 2, 0]}>
                     <boxGeometry args={[0.28, LINK_2, 0.28]} />
                     {body}
                  </mesh>
                  <group ref={wrist} position={[0, LINK_2, 0]}>
                     <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.12, 0.12, 0.34, 16]} />
                        {servo}
                     </mesh>
                     {/* wrist servo, gripper palm and fingers (140 mm to the tip) */}
                     <mesh position={[0, 0.3, 0]}>
                        <boxGeometry args={[0.36, 0.4, 0.3]} />
                        {servo}
                     </mesh>
                     <mesh position={[0, 0.56, 0]}>
                        <boxGeometry args={[0.82, 0.12, 0.34]} />
                        {body}
                     </mesh>
                     <mesh position={[-0.33, LINK_3 - 0.4, 0]}>
                        <boxGeometry args={[0.1, 0.8, 0.3]} />
                        {servo}
                     </mesh>
                     <mesh position={[0.33, LINK_3 - 0.4, 0]}>
                        <boxGeometry args={[0.1, 0.8, 0.3]} />
                        {servo}
                     </mesh>
                     {/* depth camera on the wrist, looking along the gripper */}
                     <group position={[0, 0.5, 0.3]}>
                        <mesh>
                           <boxGeometry args={[0.6, 0.16, 0.16]} />
                           <Material color={palette.ink} metal={0.2} />
                        </mesh>
                        <CameraFrustum color={palette.camera} />
                     </group>
                  </group>
               </group>
            </group>
         </group>
      </group>
   );
}

const LIDAR_RANGE = 3.4;
const TRAIL = 0.9; // radians of fading trail behind the beam

/** Amber 360° LiDAR scan on the floor: range rings and a rotating beam with a fading trail. */
function LidarScan({ color, animate }: { color: string; animate: boolean }) {
   const beam = useRef<THREE.Group>(null);
   useFrame((_, delta) => {
      if (animate && beam.current) beam.current.rotation.y += delta * 1.6;
   });
   const beamGeometry = useMemo(
      () =>
         new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(LIDAR_RANGE, 0, 0),
         ]),
      []
   );
   // Trail as stacked thin wedges, more transparent the further behind the beam
   const trail = [0.16, 0.11, 0.07, 0.04];
   return (
      <group position={[LIDAR_POS[0], 0.012, LIDAR_POS[2]]}>
         {[1.1, 2.2, LIDAR_RANGE].map((r) => (
            <mesh key={r} rotation={[-Math.PI / 2, 0, 0]}>
               <ringGeometry args={[r - 0.012, r + 0.012, 64]} />
               <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={0.35}
                  depthWrite={false}
                  side={THREE.DoubleSide}
               />
            </mesh>
         ))}
         <group ref={beam}>
            {trail.map((opacity, i) => (
               <mesh key={opacity} rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry
                     args={[LIDAR_RANGE, 16, (i * TRAIL) / trail.length, TRAIL / trail.length]}
                  />
                  <meshBasicMaterial
                     color={color}
                     transparent
                     opacity={opacity}
                     depthWrite={false}
                     side={THREE.DoubleSide}
                  />
               </mesh>
            ))}
            <lineSegments geometry={beamGeometry}>
               <lineBasicMaterial color={color} />
            </lineSegments>
         </group>
      </group>
   );
}

/**
 * The whole robot (chassis, arm, LiDAR scan) drives a slow loop: a mecanum
 * strafe sideways plus a gentle turn, so it reads as a moving robot.
 */
function MobileRobot({ palette, lowPower }: { palette: Palette; lowPower: boolean }) {
   const robot = useRef<THREE.Group>(null);
   useFrame(({ clock }) => {
      const t = clock.elapsedTime;
      if (!robot.current) return;
      robot.current.position.set(Math.sin(t * 0.35) * 0.25, 0, Math.sin(t * 0.22) * 0.55);
      robot.current.rotation.y = Math.sin(t * 0.3) * 0.18;
   });
   return (
      <group ref={robot}>
         <LidarScan color={palette.lidar} animate />
         <Chassis palette={palette} animate />
         <Arm palette={palette} followPointer={!lowPower} />
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
      position: [2.3, 0.36, 1.25],
      size: [0.5, 0.7, 0.5],
      phase: 0,
   },
   {
      label: "box 0.87 · 1.10 m",
      shape: "box",
      position: [3.1, 0.26, -1.25],
      size: [0.7, 0.5, 0.6],
      phase: 1.7,
   },
   {
      label: "ball 0.79 · 0.95 m",
      shape: "ball",
      position: [2.55, 0.26, 0.05],
      size: [0.5, 0.5, 0.5],
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
            det.position[1] + Math.sin(clock.elapsedTime * 0.9 + det.phase) * 0.04;
   });
   const [w, h, d] = det.size;
   const boxEdges = useMemo(
      () => new THREE.EdgesGeometry(new THREE.BoxGeometry(w * 1.2, h * 1.2, d * 1.2)),
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
            position={[-w * 0.6, h * 0.6 + 0.02, d * 0.6]}
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

const LOOK_TARGET: [number, number, number] = [1.35, 0.95, 0];

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
         camera={{ position: [5.6, 3.9, 6.2], fov: 38 }}
         onCreated={({ gl }) => {
            gl.setClearColor(palette.background);
            onReady();
         }}
      >
         <color attach="background" args={[palette.background]} />
         <LookAt target={LOOK_TARGET} />
         <Throttle fps={30} active={lowPower && !paused} />
         <ambientLight intensity={0.55} />
         <directionalLight position={[4, 7, 3]} intensity={1.4} />
         <directionalLight position={[-4, 3, -3]} intensity={0.4} color={palette.camera} />
         <gridHelper args={[16, 32, palette.line, palette.line]} />
         <MobileRobot palette={palette} lowPower={lowPower} />
         {detections.map((det) => (
            <DetectedObject key={det.label} det={det} palette={palette} animate />
         ))}
      </Canvas>
   );
}
