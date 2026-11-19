import type { Vec3 } from "../assembly/frames";
import { anchorOf, type Layout } from "../assembly/layout";
import type { PlanWire } from "../assembly/plan";
import type { Build } from "../model/types";
import type { SceneWire } from "./scene/LabScene";

/** Where each part's wires attach in the 3D view (mm), from the layout. */
export function sceneWires(build: Build, layout: Layout, planWires: PlanWire[]): SceneWire[] {
   const geo = layout.geometry;
   const centre: Vec3 = geo ? [0, geo.chassis.topY, 0] : [0, 50, 0];
   const point = (uid: string): Vec3 => {
      const placed = layout.placements.find((p) => p.uid === uid);
      if (placed) return anchorOf(placed);
      const motor = layout.motors.find((m) => m?.uid === uid);
      if (motor) return [motor.pos[0], motor.pos[1] + 15, motor.pos[2]];
      const servo = layout.servos.findIndex((s) => s?.uid === uid);
      if (servo >= 0 && geo?.armBase) return [geo.armBase[0], geo.armBase[1] + 40, geo.armBase[2]];
      return centre;
   };
   return build.wires.map((w) => ({
      id: w.id,
      kind: planWires.find((p) => p.id === w.id)?.kind ?? "invalid",
      from: point(w.from.uid),
      to: point(w.to.uid),
   }));
}
