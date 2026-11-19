import type { Layout, Placement } from "../assembly/layout";
import { MOTOR_CLASSES, SERVO_CLASSES } from "../model/physical";
import type { Issue } from "../model/types";

const dims = (p: Placement) => p.phys.sizeMm.map(Math.round).join(" × ");

/** Does each part physically fit where it has to go? */
export function checkFit(layout: Layout): Issue[] {
   const issues: Issue[] = [];
   const geo = layout.geometry;
   if (!geo) return issues;

   const classCheck = (
      units: (Placement | null)[],
      order: readonly string[],
      mount: string | undefined,
      what: "servo" | "motor",
   ) => {
      if (!mount) return;
      const seen = new Set<string>();
      for (const u of units) {
         if (!u || seen.has(u.uid) || !u.phys.mountClass) continue;
         seen.add(u.uid);
         const diff = order.indexOf(u.phys.mountClass) - order.indexOf(mount);
         if (diff === 0) continue;
         issues.push(
            diff > 0
               ? {
                    id: `${what}-fit:${u.uid}`,
                    severity: "error",
                    category: "mechanical",
                    title: `${u.part.name} won't fit the frame's ${mount} ${what} mounts`,
                    detail: `It is ${dims(u)} mm (${u.phys.mountClass} size) but the frame's ${what === "servo" ? "joint brackets" : "motor brackets"} take ${mount} ${what}s. Pick a ${mount}-size ${what} or a frame built for this size.`,
                    uids: [u.uid],
                 }
               : {
                    id: `${what}-fit:${u.uid}`,
                    severity: "warning",
                    category: "mechanical",
                    title: `${u.part.name} is smaller than the frame's ${mount} ${what} mounts`,
                    detail: `It needs adapter plates or a different bracket to sit in a ${mount} mount, and the joint/axle alignment will be off unless you design them carefully.`,
                    uids: [u.uid],
                 },
         );
      }
   };
   classCheck(layout.servos, SERVO_CLASSES, geo.servoMount, "servo");
   classCheck(layout.motors, MOTOR_CLASSES, geo.motorMount, "motor");

   const bay = geo.bay;
   for (const b of layout.placements.filter((p) => p.zone === "bay")) {
      const [l, w, h] = b.phys.sizeMm;
      const [bl, bw, bh] = bay!.size;
      const fits = (l <= bl && w <= bw) || (w <= bl && l <= bw);
      if (!fits || h > bh) {
         issues.push({
            id: `battery-fit:${b.uid}`,
            severity: "warning",
            category: "mechanical",
            title: `${b.part.name} doesn't fit the battery bay`,
            detail: `The pack is ${dims(b)} mm; the bay is ${bay!.size.join(" × ")} mm. Strapping it on top raises the centre of gravity and leaves it unprotected in a crash — choose a pack that fits, or plan a new bay.`,
            uids: [b.uid],
         });
      }
   }

   if (layout.overflow.length > 0) {
      const uids = [...new Set(layout.overflow.map((p) => p.uid))];
      issues.push({
         id: "deck-space",
         severity: "warning",
         category: "mechanical",
         title: `No room on ${geo.deck.maxLevels} deck${geo.deck.maxLevels > 1 ? "s" : ""} for ${layout.overflow.length} part${layout.overflow.length > 1 ? "s" : ""}`,
         detail: `${layout.overflow.map((p) => p.part.name).join(", ")} can't be mounted on the frame's decks. Remove parts or pick smaller ones.`,
         uids,
      });
   }
   return issues;
}
