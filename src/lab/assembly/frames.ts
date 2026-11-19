import type { MotorClass, ServoClass } from "../model/physical";

/**
 * Mechanical geometry of each frame, in mm. Axes: x forward, y up, z to the
 * robot's right; origin on the ground under the robot's centre.
 */

export type FrameKind = "rover" | "tank" | "car" | "arm" | "mobile-arm" | "dog" | "hexapod" | "humanoid";

export type Vec3 = [number, number, number];

export interface FrameGeometry {
   kind: FrameKind;
   /** Main plate / body: L (x) × W (z) × T, and the height of its top surface. */
   chassis: { size: Vec3; topY: number };
   /** First electronics deck: top surface height, usable area and its x offset. */
   deck: { y: number; size: [number, number]; offsetX: number; maxLevels: number };
   /** Battery bay (inside the chassis or body). Null: battery sits beside the robot. */
   bay: { center: Vec3; size: Vec3 } | null;
   /** Drive motor body centres; motors point along ±z (wheel side). */
   motorAnchors: { pos: Vec3; side: 1 | -1 }[];
   wheelRadius: number;
   /** Front sensor mount: x of the mounting face, height, and a low bumper height. */
   front: { x: number; y: number; lowY: number };
   /** Where an arm's base sits (arm and mobile manipulator). */
   armBase?: Vec3;
   /** Arm link lengths: upper arm, forearm, wrist + gripper. */
   armLinks?: [number, number, number];
   servoMount?: ServoClass;
   motorMount?: MotorClass;
   jointLabels: string[];
   /** Hardware and steps for assembling the bare frame. */
   hardware: { item: string; qty: number }[];
   steps: string[];
}

const legs = (names: string[], joints: string[]) => names.flatMap((n) => joints.map((j) => `${n} ${j}`));

const ROVER_HW = [
   { item: "M3×8 button-head screw", qty: 16 },
   { item: "M3 nylock nut", qty: 16 },
   { item: "M3×35 hex standoff (deck 1)", qty: 4 },
];

export const FRAME_GEOMETRY: Record<string, FrameGeometry> = {
   "frame-mecanum": {
      kind: "rover",
      chassis: { size: [240, 150, 3], topY: 45 },
      deck: { y: 83, size: [220, 150], offsetX: 0, maxLevels: 2 },
      bay: { center: [-20, 62, 0], size: [125, 52, 32] },
      motorAnchors: [
         { pos: [80, 32.5, 37], side: 1 },
         { pos: [80, 32.5, -37], side: -1 },
         { pos: [-80, 32.5, 37], side: 1 },
         { pos: [-80, 32.5, -37], side: -1 },
      ],
      wheelRadius: 32.5,
      front: { x: 122, y: 100, lowY: 55 },
      motorMount: "25mm",
      jointLabels: [],
      hardware: [...ROVER_HW, { item: "65 mm mecanum wheel (2 left-hand A, 2 right-hand B)", qty: 4 }],
      steps: [
         "Bolt the two side rails to the lower plate with 8× M3×8 and nylock nuts; check the plate is square before tightening.",
         "Screw 4× M3×35 standoffs into the lower plate corners — deck 1 sits on these later.",
         "Mecanum wheels are handed: rollers must form an X when seen from above (A-wheels front-left and rear-right).",
      ],
   },
   "frame-tank": {
      kind: "tank",
      chassis: { size: [240, 150, 3], topY: 55 },
      deck: { y: 93, size: [220, 150], offsetX: 0, maxLevels: 2 },
      bay: { center: [0, 74, 0], size: [125, 52, 36] },
      motorAnchors: [
         { pos: [-90, 30, 40], side: 1 },
         { pos: [-90, 30, -40], side: -1 },
      ],
      wheelRadius: 30,
      front: { x: 125, y: 110, lowY: 70 },
      motorMount: "25mm",
      jointLabels: [],
      hardware: [
         ...ROVER_HW,
         { item: "Track idler wheel with M4×25 axle bolt", qty: 6 },
         { item: "Drive sprocket (6 mm hub)", qty: 2 },
         { item: "Rubber track", qty: 2 },
      ],
      steps: [
         "Bolt the side plates to the hull with 8× M3×8 and nylock nuts.",
         "Fit the idler wheels on M4×25 axle bolts — snug, still free to spin.",
         "Drive sprockets go at the rear; fit the tracks after the motors so you can tension them.",
      ],
   },
   "frame-ackermann": {
      kind: "car",
      chassis: { size: [300, 140, 3], topY: 40 },
      deck: { y: 78, size: [240, 140], offsetX: -10, maxLevels: 2 },
      bay: { center: [-30, 58, 0], size: [125, 52, 32] },
      motorAnchors: [{ pos: [-105, 35, 0], side: 1 }],
      wheelRadius: 33,
      front: { x: 152, y: 95, lowY: 50 },
      motorMount: "25mm",
      servoMount: "standard",
      jointLabels: ["Steering"],
      hardware: [
         ...ROVER_HW,
         { item: "Steering knuckle + tie rod set", qty: 1 },
         { item: "Rear differential with 25 mm motor plate", qty: 1 },
         { item: "66 mm road wheel with 12 mm hex hub", qty: 4 },
      ],
      steps: [
         "Bolt the differential and rear axle to the chassis with 4× M3×8.",
         "Fit the steering knuckles and tie rod; the steering servo bolts in at the front later.",
      ],
   },
   "frame-arm-6dof": {
      kind: "arm",
      chassis: { size: [240, 180, 5], topY: 5 },
      deck: { y: 5, size: [120, 170], offsetX: 55, maxLevels: 1 },
      bay: null,
      motorAnchors: [],
      wheelRadius: 0,
      front: { x: 122, y: 40, lowY: 20 },
      armBase: [-60, 5, 0],
      armLinks: [105, 100, 75],
      servoMount: "standard",
      jointLabels: ["Base yaw", "Shoulder", "Elbow", "Wrist pitch", "Wrist roll", "Gripper"],
      hardware: [
         { item: "Base bearing turntable", qty: 1 },
         { item: "Standard servo U-bracket", qty: 5 },
         { item: "M3×8 screw", qty: 24 },
         { item: "M3 nylock nut", qty: 24 },
         { item: "Rubber foot", qty: 4 },
      ],
      steps: [
         "Fix the turntable bearing to the base plate with 4× M3×8; stick the rubber feet underneath.",
         "Pre-assemble the U-brackets with their bearings; servos go in at the joint step, centred to 90° first.",
      ],
   },
   "frame-mobile-manipulator": {
      kind: "mobile-arm",
      chassis: { size: [260, 170, 3], topY: 45 },
      deck: { y: 83, size: [170, 170], offsetX: -40, maxLevels: 2 },
      bay: { center: [-30, 62, 0], size: [165, 60, 32] },
      motorAnchors: [
         { pos: [85, 32.5, 42], side: 1 },
         { pos: [85, 32.5, -42], side: -1 },
         { pos: [-85, 32.5, 42], side: 1 },
         { pos: [-85, 32.5, -42], side: -1 },
      ],
      wheelRadius: 32.5,
      front: { x: 132, y: 100, lowY: 55 },
      armBase: [85, 86, 0],
      armLinks: [74, 74, 140],
      motorMount: "25mm",
      servoMount: "bus-standard",
      jointLabels: ["Turret", "Shoulder", "Elbow", "Wrist pitch", "Wrist roll", "Gripper"],
      hardware: [
         ...ROVER_HW,
         { item: "65 mm mecanum wheel (A/B)", qty: 4 },
         { item: "Arm turret plate", qty: 1 },
         { item: "Bus-servo U-bracket", qty: 5 },
      ],
      steps: [
         "Assemble the mecanum base as for the rover; deck 1 is shortened at the front to leave the turret area free.",
         "Bolt the turret plate to the front of deck 1 with 4× M3×8 — the arm mounts on it.",
      ],
   },
   "frame-quadruped": {
      kind: "dog",
      chassis: { size: [240, 110, 55], topY: 200 },
      deck: { y: 200, size: [220, 105], offsetX: 0, maxLevels: 2 },
      bay: { center: [0, 172, 0], size: [140, 70, 45] },
      motorAnchors: [],
      wheelRadius: 0,
      front: { x: 150, y: 185, lowY: 175 },
      servoMount: "standard",
      jointLabels: legs(["Left front", "Right front", "Left hind", "Right hind"], ["hip roll", "hip pitch", "knee"]),
      hardware: [
         { item: "Body shell halves", qty: 2 },
         { item: "Standard servo U-bracket", qty: 8 },
         { item: "Aluminium thigh / shin link", qty: 8 },
         { item: "M3×8 screw", qty: 48 },
         { item: "M3 nylock nut", qty: 48 },
      ],
      steps: [
         "Bolt the two body shell halves together around the battery bay with 8× M3×8.",
         "Pre-fit thigh and shin links to their U-brackets; servos go in at the joint step, centred first.",
      ],
   },
   "frame-hexapod": {
      kind: "hexapod",
      chassis: { size: [200, 170, 3], topY: 130 },
      deck: { y: 133, size: [150, 120], offsetX: 0, maxLevels: 2 },
      bay: { center: [0, 112, 0], size: [115, 64, 32] },
      motorAnchors: [],
      wheelRadius: 0,
      front: { x: 108, y: 140, lowY: 120 },
      servoMount: "bus-standard",
      jointLabels: legs(["L1", "L2", "L3", "R1", "R2", "R3"], ["coxa", "femur", "tibia"]),
      hardware: [
         { item: "Hexagonal body plate", qty: 2 },
         { item: "M3×30 standoff (between plates)", qty: 6 },
         { item: "Bus-servo bracket set", qty: 18 },
      ],
      steps: [
         "Join the two hexagonal plates with 6× M3×30 standoffs; the battery lives between them.",
         "Each leg: coxa bracket → femur link → tibia. Set every servo ID before fitting it (1–18, leg by leg).",
      ],
   },
   "frame-humanoid": {
      kind: "humanoid",
      chassis: { size: [70, 140, 130], topY: 330 },
      deck: { y: 300, size: [70, 140], offsetX: -80, maxLevels: 3 },
      bay: { center: [0, 260, 0], size: [60, 125, 110] },
      motorAnchors: [],
      wheelRadius: 0,
      front: { x: 32, y: 365, lowY: 330 },
      servoMount: "bus-large",
      jointLabels: [
         "Neck",
         ...legs(["Left", "Right"], ["shoulder pitch", "shoulder roll", "elbow"]),
         ...legs(["Left", "Right"], ["hip yaw", "hip roll", "hip pitch", "knee", "ankle"]),
      ],
      hardware: [
         { item: "Torso shell + backpack shelf", qty: 1 },
         { item: "Bus-servo bracket set", qty: 17 },
         { item: "Foot plate with rubber sole", qty: 2 },
      ],
      steps: [
         "Assemble the torso shell around the battery bay; the backpack shelf holds the electronics.",
         "Set servo IDs 1–17 before assembly; build each limb from the torso outwards with every servo centred.",
      ],
   },
};
