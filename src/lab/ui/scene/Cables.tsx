"use client";

import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useContext, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Line2, LineMaterial } from "three-stdlib";
import type { Cable, CableKind } from "../../assembly/cables";
import type { Layout, Placement } from "../../assembly/layout";
import { portOffsets } from "../../assembly/ports3d";
import { StageContext } from "./parts";

export const CABLE_COLOURS: Record<CableKind, string> = {
   power: "rgb(225,60,60)",
   motor: "rgb(240,165,45)",
   i2c: "rgb(80,150,255)",
   uart: "rgb(70,200,120)",
   spi: "rgb(170,110,240)",
   usb: "rgb(205,208,215)",
   csi: "rgb(240,240,236)",
   pcie: "rgb(240,240,236)",
   pwm: "rgb(245,215,70)",
   gpio: "rgb(60,200,200)",
   "bus-servo": "rgb(130,150,255)",
   invalid: "rgb(255,80,200)",
};

const SAMPLES = 14;
const FLAT = new Array(SAMPLES * 3).fill(0);
const INITIAL = Array.from({ length: SAMPLES }, () => new THREE.Vector3());

/** One cable, re-routed every frame from connector to connector (joints move). */
function CableLine({ cable, offA, offB, root }: { cable: Cable; offA: THREE.Vector3; offB: THREE.Vector3; root: React.RefObject<THREE.Group | null> }) {
   const ctx = useContext(StageContext);
   const ref = useRef<Line2>(null);
   const a = useMemo(() => new THREE.Vector3(), []);
   const b = useMemo(() => new THREE.Vector3(), []);
   const curve = useMemo(() => new THREE.CubicBezierCurve3(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()), []);
   const base = useMemo(() => new THREE.Color(CABLE_COLOURS[cable.kind]), [cable.kind]);
   const alarm = useMemo(() => new THREE.Color(cable.fault === "error" ? "rgb(255,70,40)" : "rgb(255,190,40)"), [cable.fault]);

   useFrame(() => {
      const line = ref.current;
      const oa = ctx.anchors.get(cable.a.key);
      const ob = ctx.anchors.get(cable.b.key);
      if (!line || !root.current) return;
      if (!oa || !ob) {
         line.visible = false;
         return;
      }
      line.visible = true;
      a.copy(offA);
      oa.localToWorld(a);
      root.current.worldToLocal(a);
      b.copy(offB);
      ob.localToWorld(b);
      root.current.worldToLocal(b);
      // Leave each connector upwards, sag-free arc between them
      const lift = Math.min(60, 18 + a.distanceTo(b) * 0.25);
      curve.v0.copy(a);
      curve.v1.set(a.x, a.y + lift, a.z);
      curve.v2.set(b.x, b.y + lift, b.z);
      curve.v3.copy(b);
      for (let i = 0; i < SAMPLES; i++) {
         const p = curve.getPoint(i / (SAMPLES - 1));
         FLAT[i * 3] = p.x;
         FLAT[i * 3 + 1] = p.y;
         FLAT[i * 3 + 2] = p.z;
      }
      line.geometry.setPositions(FLAT);
      const mat = line.material as LineMaterial;
      if (cable.fault) mat.color.copy(base).lerp(alarm, 0.5 + 0.5 * Math.sin(ctx.time.current * 6));
   });

   const wide = cable.kind === "csi" || cable.kind === "pcie";
   return (
      <Line
         ref={ref}
         points={INITIAL}
         color={cable.fault ? alarm : base}
         lineWidth={cable.fault ? 3.5 : wide ? 4 : 2.2}
         dashed={cable.kind === "invalid"}
         dashSize={6}
         gapSize={4}
      />
   );
}

export function Cables({ cables, layout, root }: { cables: Cable[]; layout: Layout; root: React.RefObject<THREE.Group | null> }) {
   const offsets = useMemo(() => {
      const byKey = new Map<string, Placement>();
      for (const p of [...layout.placements, ...layout.motors, ...layout.servos]) if (p) byKey.set(p.key, p);
      const cache = new Map<string, Map<string, [number, number, number]>>();
      const off = (key: string, port: string) => {
         const p = byKey.get(key);
         if (!p) return new THREE.Vector3();
         if (!cache.has(p.part.id)) cache.set(p.part.id, portOffsets(p.part, p.phys));
         const v = cache.get(p.part.id)!.get(port) ?? [0, 0, 0];
         return new THREE.Vector3(...v);
      };
      return new Map(cables.map((c) => [c.id, [off(c.a.key, c.a.port), off(c.b.key, c.b.port)] as const]));
   }, [cables, layout]);

   return (
      <group>
         {cables.map((c) => {
            const [offA, offB] = offsets.get(c.id)!;
            return <CableLine key={c.id} cable={c} offA={offA} offB={offB} root={root} />;
         })}
      </group>
   );
}
