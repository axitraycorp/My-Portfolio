import { getPart } from "../model/catalog";
import { getPhysical, type Physical } from "../model/physical";
import type { Build, Part } from "../model/types";
import { FRAME_GEOMETRY, type FrameGeometry, type Vec3 } from "./frames";

/** Assembly steps, in build order. Every placed part belongs to one. */
export const STEP_ORDER = ["frame", "actuators", "power", "regulation", "brains", "drivers", "sensors", "wiring"] as const;
export type StepId = (typeof STEP_ORDER)[number];

export type Zone = "deck" | "top" | "front" | "under" | "bay" | "stack" | "ground";

export interface Placement {
   key: string;
   uid: string;
   unit: number;
   part: Part;
   phys: Physical;
   /** Centre of the part's underside (boards: underside of the PCB, standoffs below). */
   pos: Vec3;
   /** 0 or π/2: rotated so its length runs across the robot. */
   rotY: number;
   step: StepId;
   zone: Zone;
   level?: number;
}

export interface Deck {
   level: number;
   /** Top surface. */
   y: number;
   size: [number, number];
   offsetX: number;
   /** Standoffs under this deck (level > 0). */
   standoffMm: number;
   step: StepId;
}

export interface Layout {
   frameId: string | null;
   geometry: FrameGeometry | null;
   decks: Deck[];
   placements: Placement[];
   /** One slot per frame motor anchor; null = missing motor. */
   motors: (Placement | null)[];
   /** One slot per frame joint; null = empty joint. */
   servos: (Placement | null)[];
   /** Parts that found no room. */
   overflow: Placement[];
}

const GAP = 5;
const PLATE = 3;
const STANDOFFS = [25, 30, 35, 40, 45, 50, 60, 70, 80];

function stepFor(part: Part): StepId {
   switch (part.category) {
      case "frame":
         return "frame";
      case "motor":
      case "servo":
         return "actuators";
      case "battery":
      case "protection":
         return "power";
      case "regulator":
         return "regulation";
      case "controller":
      case "compute":
      case "accelerator":
      case "cooling":
         return "brains";
      case "motor-driver":
      case "servo-driver":
         return "drivers";
      case "camera":
      case "sensor":
         return "sensors";
   }
}

function sensorZone(part: Part): Zone {
   switch (part.sensor?.type) {
      case "lidar":
      case "gps":
         return "top";
      case "depth-camera":
      case "camera":
      case "radar":
      case "ultrasonic":
      case "tof":
         return "front";
      case "line":
         return "under";
      default:
         return "deck";
   }
}

/** Footprint after rotation. */
const footprint = (p: Physical, rotY: number): [number, number] =>
   rotY ? [p.sizeMm[1], p.sizeMm[0]] : [p.sizeMm[0], p.sizeMm[1]];

const ownHeight = (p: Placement) => (p.phys.standoffMm ?? 0) + p.phys.sizeMm[2];

/** Total height above the deck, including standoffs and anything stacked on it. */
function stackHeight(p: Placement, stacks: Map<Placement, Placement>): number {
   let h = ownHeight(p);
   for (const [item, host] of stacks) if (host === p) h += item.part.category === "cooling" ? item.phys.sizeMm[2] : ownHeight(item);
   return h;
}

/** Shelf-packs items onto deck levels: rows run across the deck, front to back. */
function packDecks(
   geo: FrameGeometry,
   items: Placement[],
   topItems: Placement[],
   all: Placement[],
   stacks: Map<Placement, Placement>,
): { decks: Deck[]; overflow: Placement[] } {
   const [L, W] = geo.deck.size;
   const decks: Deck[] = [];
   const overflow: Placement[] = [];

   let level = -1;
   let cursorX = 0;
   let rowZ = 0;
   let rowDepth = 0;
   let levelItems: Placement[] = [];

   const openLevel = (): boolean => {
      if (level + 1 >= geo.deck.maxLevels) return false;
      level++;
      const below = decks[level - 1];
      const tallest = below ? Math.max(25, ...levelItems.map((p) => stackHeight(p, stacks))) + 8 : 0;
      const standoff = below ? (STANDOFFS.find((s) => s >= tallest) ?? 80) : 0;
      const y = below ? below.y + standoff + PLATE : geo.deck.y;
      decks.push({ level, y, size: geo.deck.size, offsetX: geo.deck.offsetX, standoffMm: standoff, step: "frame" });
      cursorX = 0;
      rowZ = 0;
      rowDepth = 0;
      levelItems = [];
      return true;
   };

   const place = (item: Placement): boolean => {
      for (const rot of [0, Math.PI / 2]) {
         const [l, w] = footprint(item.phys, rot);
         if (l > L || w > W) continue;
         let x = cursorX;
         let z = rowZ;
         if (x + l > L) {
            x = 0;
            z = rowZ + rowDepth + GAP;
         }
         if (z + w > W) continue;
         if (x === 0 && z !== rowZ) {
            rowZ = z;
            rowDepth = 0;
         }
         const deck = decks[level];
         // Front of the deck first (x runs from the front edge backwards)
         item.pos = [deck.offsetX + L / 2 - x - l / 2, deck.y, -W / 2 + z + w / 2];
         item.rotY = rot;
         item.level = level;
         cursorX = x + l + GAP;
         rowDepth = Math.max(rowDepth, w);
         levelItems.push(item);
         return true;
      }
      return false;
   };

   openLevel();
   // Earlier assembly steps go on lower decks (an upper deck covers what is under it); big parts first within a step
   const area = (p: Placement) => p.phys.sizeMm[0] * p.phys.sizeMm[1];
   const sorted = [...items].sort((a, b) => STEP_ORDER.indexOf(a.step) - STEP_ORDER.indexOf(b.step) || area(b) - area(a));
   for (const item of sorted) {
      while (!place(item)) {
         if (!openLevel()) {
            overflow.push(item);
            break;
         }
      }
   }
   // Lidar / GPS go on the top level, nothing above them
   for (const item of topItems) {
      if (!place(item) && !(openLevel() && place(item))) overflow.push(item);
   }
   // A level holding only lidar/GPS: centre them so the scan sees all round
   for (const d of decks) {
      const onLevel = [...items, ...topItems].filter((p) => p.level === d.level && !overflow.includes(p));
      if (onLevel.length > 0 && onLevel.every((p) => topItems.includes(p))) {
         onLevel.forEach((p, i) => {
            p.pos = [d.offsetX, d.y, (i - (onLevel.length - 1) / 2) * 80];
         });
      }
   }
   // A deck plate is fitted in the step of the first part that needs it
   for (const d of decks) {
      if (d.level === 0) continue;
      const users = all.filter((p) => p.level === d.level);
      const first = Math.min(...users.map((p) => STEP_ORDER.indexOf(p.step)));
      d.step = STEP_ORDER[Number.isFinite(first) ? first : 0];
   }
   return { decks, overflow };
}

/** Where every part of a build physically goes. Pure; used by the 3D view, plan and fit checks. */
export function computeLayout(build: Build): Layout {
   const units: Placement[] = [];
   let frameId: string | null = null;
   for (const inst of build.parts) {
      const part = getPart(inst.partId);
      if (!part) continue;
      if (part.category === "frame") {
         frameId ??= part.id;
         continue;
      }
      for (let unit = 0; unit < inst.count; unit++) {
         units.push({
            key: `${inst.uid}#${unit}`,
            uid: inst.uid,
            unit,
            part,
            phys: getPhysical(part.id),
            pos: [0, 0, 0],
            rotY: 0,
            step: stepFor(part),
            zone: "deck",
         });
      }
   }

   const geometry = frameId ? (FRAME_GEOMETRY[frameId] ?? null) : null;
   const layout: Layout = { frameId, geometry, decks: [], placements: [], motors: [], servos: [], overflow: [] };
   if (!geometry) {
      layout.overflow = units;
      return layout;
   }

   const motors = units.filter((u) => u.part.category === "motor");
   const servos = units.filter((u) => u.part.category === "servo");
   layout.motors = geometry.motorAnchors.map((a, i) => {
      const m = motors[i];
      if (!m) return null;
      m.pos = a.pos;
      m.rotY = a.side > 0 ? 0 : Math.PI;
      m.zone = "ground";
      return m;
   });
   layout.servos = geometry.jointLabels.map((_, i) => servos[i] ?? null);
   const spareActuators = [...motors.slice(geometry.motorAnchors.length), ...servos.slice(geometry.jointLabels.length)];

   const rest = units.filter((u) => u.part.category !== "motor" && u.part.category !== "servo");
   const deckItems: Placement[] = [...spareActuators];
   const topItems: Placement[] = [];
   const placed: Placement[] = [];

   // Battery bay, or beside the robot when there is no bay or it is mains-powered
   const batteries = rest.filter((u) => u.part.category === "battery");
   batteries.forEach((b, i) => {
      if (b.phys.method === "off-board" || !geometry.bay) {
         b.zone = "ground";
         b.pos = [-40 - i * 20, 0, -geometry.chassis.size[1] / 2 - 90 - i * 120];
      } else if (i === 0) {
         b.zone = "bay";
         const [bx, by, bz] = geometry.bay.center;
         b.pos = [bx, by - geometry.bay.size[2] / 2, bz];
         // Long packs lie across a narrow, tall bay (humanoid torso)
         b.rotY = b.phys.sizeMm[0] > geometry.bay.size[0] + 1 ? Math.PI / 2 : 0;
      } else {
         deckItems.push(b);
         return;
      }
      placed.push(b);
   });

   const computes = rest.filter((u) => u.part.category === "compute");
   const cooled = new Set<string>();
   const stacks = new Map<Placement, Placement>();
   let frontCount = 0;
   const fronts = rest.filter((u) => u.part.sensor !== undefined && sensorZone(u.part) === "front");

   for (const u of rest) {
      if (u.part.category === "battery") continue;
      if (u.part.category === "accelerator") {
         const host = computes.find((c) => u.part.mountsOn?.includes(c.part.id));
         if (host) {
            u.zone = "stack";
            stacks.set(u, host);
            placed.push(u);
            continue;
         }
      }
      if (u.part.category === "cooling") {
         const host = computes.find((c) => !cooled.has(c.key));
         if (host) {
            cooled.add(host.key);
            u.zone = "stack";
            stacks.set(u, host);
            placed.push(u);
            continue;
         }
      }
      if (u.part.sensor) {
         const zone = sensorZone(u.part);
         if (zone === "top") {
            u.zone = "top";
            topItems.push(u);
            continue;
         }
         if (zone === "front") {
            u.zone = "front";
            const i = frontCount++;
            const z = (i - (fronts.length - 1) / 2) * 60;
            const low = u.part.sensor?.type === "ultrasonic";
            u.pos = [geometry.front.x + u.phys.sizeMm[1] / 2, low ? geometry.front.lowY : geometry.front.y, z];
            u.rotY = Math.PI / 2;
            placed.push(u);
            continue;
         }
         if (zone === "under") {
            u.zone = "under";
            u.pos = [geometry.front.x - 30, Math.max(8, geometry.chassis.topY - 40), 0];
            u.rotY = Math.PI / 2;
            placed.push(u);
            continue;
         }
      }
      deckItems.push(u);
   }

   const all = [...placed, ...deckItems, ...topItems];
   const { decks, overflow } = packDecks(geometry, deckItems, topItems, all, stacks);
   layout.decks = decks;
   layout.overflow = overflow;

   // Stacked parts sit on their host: HAT first, cooler on top
   const stacked = [...stacks.entries()].sort(([x], [y]) => (x.part.category === "cooling" ? 1 : 0) - (y.part.category === "cooling" ? 1 : 0));
   const tops = new Map<Placement, number>();
   for (const [u, host] of stacked) {
      const top = tops.get(host) ?? host.pos[1] + ownHeight(host);
      // A HAT stands on the host PCB (its standoffs replace the host screws); a cooler sits on the top
      const y = u.part.category === "cooling" ? top : host.pos[1] + (host.phys.standoffMm ?? 0) + 1.6;
      u.pos = [host.pos[0], y, host.pos[2]];
      u.rotY = host.rotY;
      u.level = host.level;
      tops.set(host, Math.max(top, y + (u.part.category === "cooling" ? u.phys.sizeMm[2] : ownHeight(u))));
   }

   layout.placements = [...placed, ...deckItems, ...topItems].filter((p) => !overflow.includes(p));
   return layout;
}

/** Top-centre of a placed part, for drawing wires. */
export function anchorOf(p: Placement): Vec3 {
   return [p.pos[0], p.pos[1] + (p.phys.standoffMm ?? 0) + p.phys.sizeMm[2], p.pos[2]];
}
