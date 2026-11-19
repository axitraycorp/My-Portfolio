/**
 * Physical data for every catalogue part: envelope, mounting holes and the
 * hardware that fixes it to the robot. Sizes are nominal (mm) for the common
 * generic module of each type — confirm against the real part before drilling.
 *
 * Axes: L along the part's length (x), W across (z), H height (y).
 * Holes are mm from the part's centre in the L × W footprint; for motors they
 * are on the gearbox face (W × H).
 */

export type ScrewSize = "M1.6" | "M2" | "M2.5" | "M3" | "1/4-20";

export type MountMethod =
   | "standoffs"
   | "carrier"
   | "stack"
   | "bracket"
   | "servo-tabs"
   | "strap"
   | "holder"
   | "tape"
   | "panel"
   | "clip"
   | "tripod"
   | "off-board";

export type BodyShape =
   | "board"
   | "module"
   | "servo"
   | "motor"
   | "battery"
   | "fan"
   | "puck"
   | "camera"
   | "sonar"
   | "switch"
   | "box";

/** Bracket sizes, smallest to largest within each family. */
export const SERVO_CLASSES = ["micro", "standard", "bus-standard", "bus-large"] as const;
export const MOTOR_CLASSES = ["n20", "tt", "25mm", "37mm"] as const;
export type ServoClass = (typeof SERVO_CLASSES)[number];
export type MotorClass = (typeof MOTOR_CLASSES)[number];

export interface Physical {
   sizeMm: [number, number, number];
   shape: BodyShape;
   /** Main colour (PCB, case), rgb() for three.js and SVG. */
   colour: string;
   method: MountMethod;
   holes: [number, number][];
   screw?: ScrewSize;
   screwLengthMm?: number;
   /** Standoff height under a board (mm). */
   standoffMm?: number;
   mountClass?: ServoClass | MotorClass;
   /** How it is fixed, in words. */
   mounting: string;
}

const PCB = {
   blue: "rgb(28,96,150)",
   green: "rgb(36,110,64)",
   black: "rgb(52,54,60)",
   red: "rgb(160,40,40)",
   purple: "rgb(92,52,130)",
};

const corners = (x: number, z: number): [number, number][] => [
   [-x, -z],
   [x, -z],
   [-x, z],
   [x, z],
];

const PHYSICAL: Record<string, Physical> = {
   // ── Controllers
   "arduino-uno": {
      sizeMm: [68.6, 53.4, 15],
      shape: "board",
      colour: PCB.blue,
      method: "standoffs",
      holes: [
         [-20.3, -24.2],
         [-19, 24],
         [31.8, -19.1],
         [31.8, 8.8],
      ],
      screw: "M3",
      screwLengthMm: 6,
      standoffMm: 10,
      mounting: "4× M3×10 nylon standoffs, 4× M3×6 screws on top, 4× M3×6 screws through the deck.",
   },
   "arduino-mega": {
      sizeMm: [101.6, 53.3, 15],
      shape: "board",
      colour: PCB.blue,
      method: "standoffs",
      holes: [
         [-36.8, -24.2],
         [-35.5, 24.1],
         [15.3, -19.1],
         [15.3, 8.9],
         [39.4, 24.1],
         [45.7, -24.2],
      ],
      screw: "M3",
      screwLengthMm: 6,
      standoffMm: 10,
      mounting: "6× M3×10 nylon standoffs with M3×6 screws top and bottom.",
   },
   "esp32-s3": {
      sizeMm: [72, 58, 18],
      shape: "board",
      colour: PCB.black,
      method: "carrier",
      holes: corners(32, 25),
      screw: "M3",
      screwLengthMm: 6,
      standoffMm: 8,
      mounting: "The dev board has no holes: plug it into a 38-pin screw-terminal carrier, then fix the carrier on 4× M3×8 standoffs.",
   },
   "stm32-f407": {
      sizeMm: [85, 63, 14],
      shape: "board",
      colour: PCB.black,
      method: "standoffs",
      holes: corners(39, 28),
      screw: "M3",
      screwLengthMm: 6,
      standoffMm: 10,
      mounting: "4× M3×10 standoffs at the corners, M3×6 screws.",
   },
   "rp2040-pico": {
      sizeMm: [51, 21, 4],
      shape: "board",
      colour: PCB.green,
      method: "standoffs",
      holes: corners(23.5, 5.7),
      screw: "M2",
      screwLengthMm: 5,
      standoffMm: 6,
      mounting: "4× M2×6 standoffs (the holes are 2.1 mm — M2 only), M2×5 screws.",
   },
   "robot-control-board": {
      sizeMm: [100, 70, 18],
      shape: "board",
      colour: PCB.black,
      method: "standoffs",
      holes: corners(45, 30),
      screw: "M3",
      screwLengthMm: 6,
      standoffMm: 10,
      mounting: "4× M3×10 standoffs, M3×6 screws. Leave room at the motor-terminal edge for the cables.",
   },

   // ── Computers
   "rpi5-8gb": {
      sizeMm: [85, 56, 17],
      shape: "board",
      colour: PCB.green,
      method: "standoffs",
      holes: [
         [-39, -24.5],
         [19, -24.5],
         [-39, 24.5],
         [19, 24.5],
      ],
      screw: "M2.5",
      screwLengthMm: 6,
      standoffMm: 10,
      mounting: "4× M2.5×10 brass standoffs on the 58 × 49 mm pattern, M2.5×6 screws. USB/Ethernet edge facing out of the robot.",
   },
   "rpi-zero-2w": {
      sizeMm: [65, 30, 5],
      shape: "board",
      colour: PCB.green,
      method: "standoffs",
      holes: corners(29, 11.5),
      screw: "M2.5",
      screwLengthMm: 5,
      standoffMm: 6,
      mounting: "4× M2.5×6 standoffs on the 58 × 23 mm pattern.",
   },
   "jetson-orin-nano-8gb": {
      sizeMm: [100, 79, 21],
      shape: "board",
      colour: PCB.black,
      method: "standoffs",
      holes: corners(43, 32.5),
      screw: "M3",
      screwLengthMm: 6,
      standoffMm: 10,
      mounting: "Carrier board on 4× M3×10 standoffs (nominal pattern — check the carrier's mechanical drawing). Keep 15 mm clear above the heatsink fan.",
   },
   "jetson-orin-nx-16gb": {
      sizeMm: [103, 90.5, 30],
      shape: "board",
      colour: PCB.black,
      method: "standoffs",
      holes: corners(46, 38),
      screw: "M3",
      screwLengthMm: 6,
      standoffMm: 10,
      mounting: "Carrier board on 4× M3×10 standoffs (nominal pattern). Module is held to the carrier by 2× M2.5 screws.",
   },
   "ai-hat-13tops": {
      sizeMm: [65, 56.5, 8],
      shape: "board",
      colour: PCB.green,
      method: "stack",
      holes: corners(29, 24.5),
      screw: "M2.5",
      screwLengthMm: 6,
      standoffMm: 16,
      mounting: "Stacks on the Pi 5: replace its top screws with 4× M2.5×16 standoffs, connect the PCIe ribbon, then 4× M2.5×6 screws.",
   },

   // ── Motor drivers
   l298n: {
      sizeMm: [43, 43, 27],
      shape: "module",
      colour: PCB.red,
      method: "standoffs",
      holes: corners(18.5, 18.5),
      screw: "M3",
      screwLengthMm: 6,
      standoffMm: 5,
      mounting: "4× M3×5 standoffs on the 37 × 37 mm pattern; keep the heatsink fins clear for airflow.",
   },
   tb6612fng: {
      sizeMm: [30, 40, 8],
      shape: "module",
      colour: PCB.red,
      method: "carrier",
      holes: [
         [0, -15],
         [0, 15],
      ],
      screw: "M3",
      screwLengthMm: 6,
      standoffMm: 5,
      mounting: "Breakout has no holes: solder it to a 30 × 40 mm perfboard, fix the perfboard with 2× M3 screws on 5 mm standoffs.",
   },
   drv8833: {
      sizeMm: [30, 30, 8],
      shape: "module",
      colour: PCB.purple,
      method: "carrier",
      holes: [
         [-11, 0],
         [11, 0],
      ],
      screw: "M3",
      screwLengthMm: 6,
      standoffMm: 5,
      mounting: "Solder to a small perfboard and fix it with 2× M3 screws on 5 mm standoffs.",
   },
   bts7960: {
      sizeMm: [50, 50, 43],
      shape: "module",
      colour: PCB.red,
      method: "standoffs",
      holes: corners(21.5, 21.5),
      screw: "M3",
      screwLengthMm: 6,
      standoffMm: 5,
      mounting: "4× M3×5 standoffs. The heatsink is live on some boards — never let it touch the metal deck.",
   },

   // ── Servo controllers
   pca9685: {
      sizeMm: [62.5, 25.4, 11],
      shape: "module",
      colour: PCB.blue,
      method: "standoffs",
      holes: corners(28, 9.5),
      screw: "M2.5",
      screwLengthMm: 5,
      standoffMm: 5,
      mounting: "4× M2.5×5 standoffs; servo headers facing the servo cable run.",
   },
   "bus-servo-adapter": {
      sizeMm: [45, 30, 12],
      shape: "module",
      colour: PCB.black,
      method: "standoffs",
      holes: corners(19, 11),
      screw: "M2",
      screwLengthMm: 5,
      standoffMm: 5,
      mounting: "4× M2×5 standoffs.",
   },

   // ── Drive motors (holes on the gearbox face)
   "tt-motor": {
      sizeMm: [70, 22.5, 18.8],
      shape: "motor",
      colour: "rgb(230,200,60)",
      method: "bracket",
      holes: [
         [0, -8.75],
         [0, 8.75],
      ],
      screw: "M3",
      screwLengthMm: 30,
      mountClass: "tt",
      mounting: "2× M3×30 bolts straight through the gearbox into the chassis, M3 nuts. Wheel pushes onto the double-D shaft, 1× M2 screw.",
   },
   "n20-encoder": {
      sizeMm: [34, 12, 10],
      shape: "motor",
      colour: "rgb(190,190,196)",
      method: "bracket",
      holes: [
         [0, -4.5],
         [0, 4.5],
      ],
      screw: "M1.6",
      screwLengthMm: 4,
      mountClass: "n20",
      mounting: "N20 clamp bracket with 2× M1.6×4 into the gearbox face, bracket to chassis with 2× M2×6.",
   },
   "micro-metal-7v4-encoder": {
      sizeMm: [75, 25, 25],
      shape: "motor",
      colour: "rgb(190,190,196)",
      method: "bracket",
      holes: [
         [0, -8.5],
         [0, 8.5],
      ],
      screw: "M3",
      screwLengthMm: 6,
      mountClass: "25mm",
      mounting: "25 mm L-bracket: 2× M3×6 into the gearbox face (17 mm apart), bracket to chassis with 2× M3×8 and nuts. Hub coupling with 2× M3×4 grub screws.",
   },
   "geared-370-12v": {
      sizeMm: [70, 25, 25],
      shape: "motor",
      colour: "rgb(190,190,196)",
      method: "bracket",
      holes: [
         [0, -8.5],
         [0, 8.5],
      ],
      screw: "M3",
      screwLengthMm: 6,
      mountClass: "25mm",
      mounting: "25 mm L-bracket: 2× M3×6 into the gearbox face, bracket to chassis with 2× M3×8. Hub coupling with 2× M3×4 grub screws.",
   },
   "geared-520-12v": {
      sizeMm: [80, 37, 37],
      shape: "motor",
      colour: "rgb(190,190,196)",
      method: "bracket",
      holes: Array.from({ length: 6 }, (_, i) => {
         const a = (i / 6) * Math.PI * 2;
         return [Math.round(Math.cos(a) * 155) / 10, Math.round(Math.sin(a) * 155) / 10] as [number, number];
      }),
      screw: "M3",
      screwLengthMm: 6,
      mountClass: "37mm",
      mounting: "37 mm motor bracket: 6× M3×6 on a 31 mm circle, bracket to chassis with 4× M3×8. 6 mm D-shaft hub, 2× M4 grub screws.",
   },

   // ── Servos (footprint holes are the mounting-tab holes)
   sg90: {
      sizeMm: [22.5, 12, 28.5],
      shape: "servo",
      colour: "rgb(40,90,170)",
      method: "servo-tabs",
      holes: [
         [-13.85, 0],
         [13.85, 0],
      ],
      screw: "M2",
      screwLengthMm: 8,
      mountClass: "micro",
      mounting: "2× M2×8 self-tapping screws through the tabs (27.7 mm apart); horn with the M2 centre screw.",
   },
   mg90s: {
      sizeMm: [22.8, 12.2, 28.5],
      shape: "servo",
      colour: "rgb(64,66,74)",
      method: "servo-tabs",
      holes: [
         [-13.85, 0],
         [13.85, 0],
      ],
      screw: "M2",
      screwLengthMm: 8,
      mountClass: "micro",
      mounting: "2× M2×8 self-tapping screws through the tabs; metal horn with the M2 centre screw.",
   },
   mg996r: {
      sizeMm: [40.7, 19.7, 42.9],
      shape: "servo",
      colour: "rgb(64,66,74)",
      method: "servo-tabs",
      holes: corners(24.75, 5),
      screw: "M3",
      screwLengthMm: 10,
      mountClass: "standard",
      mounting: "Standard servo bracket: 4× M3×10 screws and nuts through the tabs (49.5 × 10 mm); horn with 4× M3×6 and the centre screw.",
   },
   "ds3218-20kg": {
      sizeMm: [40, 20, 40.5],
      shape: "servo",
      colour: "rgb(64,66,74)",
      method: "servo-tabs",
      holes: corners(24.5, 5),
      screw: "M3",
      screwLengthMm: 10,
      mountClass: "standard",
      mounting: "Standard U-bracket: 4× M3×10 screws and nuts through the tabs; 25T metal horn with 4× M3×6.",
   },
   "bus-servo-15kg": {
      sizeMm: [45.2, 24.7, 35],
      shape: "servo",
      colour: "rgb(64,66,74)",
      method: "bracket",
      holes: corners(18, 8),
      screw: "M2",
      screwLengthMm: 5,
      mountClass: "bus-standard",
      mounting: "Case has threaded inserts: 4× M2×5 into the U-bracket, 4× M2×5 through the output horn, 1× M3 centre screw.",
   },
   "bus-servo-35kg": {
      sizeMm: [54.4, 21, 46],
      shape: "servo",
      colour: "rgb(64,66,74)",
      method: "bracket",
      holes: corners(21, 7),
      screw: "M2.5",
      screwLengthMm: 6,
      mountClass: "bus-large",
      mounting: "Large bus-servo bracket: 4× M2.5×6 into the case inserts, 6× M2.5×6 through the horn, centre screw M3.",
   },

   // ── Sensors
   "depth-camera-usb": {
      sizeMm: [90, 25, 30],
      shape: "camera",
      colour: "rgb(64,66,74)",
      method: "tripod",
      holes: [[0, 0]],
      screw: "1/4-20",
      screwLengthMm: 6,
      mounting: "1/4\"-20 thread underneath: 1× 1/4\"-20 × 6 mm screw through an L-bracket fixed to the deck with 2× M3×8.",
   },
   "csi-camera-12mp": {
      sizeMm: [25, 24, 11.5],
      shape: "camera",
      colour: PCB.green,
      method: "standoffs",
      holes: [
         [-10.5, -10],
         [10.5, -10],
         [-10.5, 2.5],
         [10.5, 2.5],
      ],
      screw: "M2",
      screwLengthMm: 4,
      standoffMm: 3,
      mounting: "Camera bracket with 4× M2×3 standoffs (21 × 12.5 mm pattern), M2×4 screws. 15→22-pin FFC ribbon to the computer.",
   },
   "usb-webcam": {
      sizeMm: [90, 30, 30],
      shape: "camera",
      colour: "rgb(64,66,74)",
      method: "tripod",
      holes: [[0, 0]],
      screw: "1/4-20",
      screwLengthMm: 6,
      mounting: "Remove the monitor clip; 1/4\"-20 screw through an L-bracket on the front of the deck.",
   },
   "lidar-2d": {
      sizeMm: [76, 76, 42],
      shape: "puck",
      colour: "rgb(64,66,74)",
      method: "standoffs",
      holes: corners(20, 20),
      screw: "M2.5",
      screwLengthMm: 6,
      standoffMm: 8,
      mounting: "Top deck, nothing taller within its scan plane: 4× M2.5×8 standoffs into the base inserts. Arrow on the base points forward.",
   },
   "mmwave-radar": {
      sizeMm: [35, 30, 8],
      shape: "module",
      colour: PCB.blue,
      method: "standoffs",
      holes: [
         [-14, 0],
         [14, 0],
      ],
      screw: "M2",
      screwLengthMm: 4,
      standoffMm: 5,
      mounting: "Front bracket, antenna side facing out, 2× M2×5 standoffs. No metal in front of the antenna.",
   },
   "hc-sr04": {
      sizeMm: [45, 20, 15],
      shape: "sonar",
      colour: PCB.blue,
      method: "bracket",
      holes: corners(21, 8.5),
      screw: "M2",
      screwLengthMm: 6,
      mounting: "Front bumper bracket with 2–4× M2×6; transducers horizontal, 2 cm behind the bumper edge.",
   },
   "line-sensor-5ch": {
      sizeMm: [80, 20, 10],
      shape: "module",
      colour: PCB.black,
      method: "standoffs",
      holes: [
         [-35, 0],
         [35, 0],
      ],
      screw: "M3",
      screwLengthMm: 6,
      standoffMm: 15,
      mounting: "Underneath the front, 2× M3 standoffs sized so the sensors sit 5–10 mm above the floor.",
   },
   mpu6050: {
      sizeMm: [21, 16, 3],
      shape: "module",
      colour: PCB.blue,
      method: "standoffs",
      holes: [
         [-7.6, 5.5],
         [7.6, 5.5],
      ],
      screw: "M2.5",
      screwLengthMm: 5,
      standoffMm: 5,
      mounting: "2× M2.5×5 nylon standoffs near the robot's centre, X arrow pointing forward. Keep it away from motors and the buck converter.",
   },
   bno055: {
      sizeMm: [27, 20, 4],
      shape: "module",
      colour: PCB.purple,
      method: "standoffs",
      holes: corners(10.5, 7.5),
      screw: "M2.5",
      screwLengthMm: 5,
      standoffMm: 5,
      mounting: "4× M2.5×5 nylon standoffs at the centre of the torso, axes aligned with the body.",
   },
   vl53l0x: {
      sizeMm: [13, 18, 2],
      shape: "module",
      colour: PCB.purple,
      method: "standoffs",
      holes: [[0, 6]],
      screw: "M2",
      screwLengthMm: 4,
      standoffMm: 3,
      mounting: "1× M2×3 standoff on a front bracket, sensor window unobstructed.",
   },
   "gps-m8n": {
      sizeMm: [60, 60, 18],
      shape: "puck",
      colour: "rgb(64,66,74)",
      method: "bracket",
      holes: [
         [0, -10],
         [0, 10],
      ],
      screw: "M3",
      screwLengthMm: 8,
      mounting: "On a 60 mm folding mast (2× M3×8), arrow forward, highest point of the robot and away from the computer.",
   },
   "voice-module": {
      sizeMm: [52, 40, 12],
      shape: "module",
      colour: PCB.black,
      method: "standoffs",
      holes: corners(22, 16),
      screw: "M3",
      screwLengthMm: 6,
      standoffMm: 6,
      mounting: "4× M3×6 standoffs, microphone holes facing up and unobstructed; speaker on 2× M2 screws.",
   },

   // ── Batteries
   "lipo-2s-2200": {
      sizeMm: [105, 34, 18],
      shape: "battery",
      colour: "rgb(60,60,66)",
      method: "strap",
      holes: [],
      mounting: "Battery bay on a foam pad with a 20 mm hook-and-loop strap; XT60 lead towards the switch. Never screw through a LiPo.",
   },
   "lipo-3s-2200": {
      sizeMm: [105, 34, 25],
      shape: "battery",
      colour: "rgb(60,60,66)",
      method: "strap",
      holes: [],
      mounting: "Battery bay on a foam pad with a 20 mm hook-and-loop strap; XT60 lead towards the switch.",
   },
   "lipo-3s-5000": {
      sizeMm: [155, 48, 28],
      shape: "battery",
      colour: "rgb(60,60,66)",
      method: "strap",
      holes: [],
      mounting: "Two hook-and-loop straps on a foam pad; needs a 160 mm bay.",
   },
   "liion-2s-3000": {
      sizeMm: [77, 40, 21],
      shape: "battery",
      colour: "rgb(30,30,34)",
      method: "holder",
      holes: [
         [-25, 0],
         [25, 0],
      ],
      screw: "M3",
      screwLengthMm: 6,
      mounting: "2×18650 holder: 2× M3×6 countersunk screws through the holder floor; cells with protection board.",
   },
   "liion-3s-3000": {
      sizeMm: [77, 60, 21],
      shape: "battery",
      colour: "rgb(30,30,34)",
      method: "holder",
      holes: [
         [-25, 0],
         [25, 0],
      ],
      screw: "M3",
      screwLengthMm: 6,
      mounting: "3×18650 holder: 2× M3×6 countersunk screws; add a 3S BMS board.",
   },
   "lifepo4-4s-6000": {
      sizeMm: [140, 70, 50],
      shape: "battery",
      colour: "rgb(40,70,110)",
      method: "strap",
      holes: [],
      mounting: "Two hook-and-loop straps on a foam pad; heavy — mount it low and central.",
   },
   "nimh-4aa": {
      sizeMm: [62, 58, 15],
      shape: "battery",
      colour: "rgb(30,30,34)",
      method: "holder",
      holes: [
         [-20, 0],
         [20, 0],
      ],
      screw: "M3",
      screwLengthMm: 6,
      mounting: "4×AA holder: 2× M3×6 countersunk screws through the holder floor.",
   },
   "power-bank-5v3a": {
      sizeMm: [150, 70, 25],
      shape: "battery",
      colour: "rgb(230,230,234)",
      method: "strap",
      holes: [],
      mounting: "Hook-and-loop strap; USB-C lead to the computer.",
   },
   "bench-psu-12v": {
      sizeMm: [200, 110, 50],
      shape: "box",
      colour: "rgb(70,72,78)",
      method: "off-board",
      holes: [],
      mounting: "Stays on the bench; 2 m tether with an XT60 at the robot end, strain-relieved with a zip tie.",
   },

   // ── Regulators
   "buck-5v-3a": {
      sizeMm: [43, 21, 14],
      shape: "module",
      colour: PCB.blue,
      method: "standoffs",
      holes: [
         [-15, -7.5],
         [15, 7.5],
      ],
      screw: "M3",
      screwLengthMm: 6,
      standoffMm: 5,
      mounting: "2× M3×5 standoffs (diagonal holes). Set the output to 5.1 V with a multimeter before connecting anything.",
   },
   "buck-5v-5a": {
      sizeMm: [60, 37, 22],
      shape: "module",
      colour: PCB.blue,
      method: "standoffs",
      holes: corners(26, 14.5),
      screw: "M3",
      screwLengthMm: 6,
      standoffMm: 5,
      mounting: "4× M3×5 standoffs; heatsink up with free air.",
   },
   "ubec-6v-10a": {
      sizeMm: [45, 27, 12],
      shape: "box",
      colour: "rgb(30,60,140)",
      method: "tape",
      holes: [],
      mounting: "Heat-shrunk case: 3M double-sided foam tape plus 1 zip tie through the deck slots.",
   },
   "buck-boost-12v-3a": {
      sizeMm: [48, 28, 16],
      shape: "module",
      colour: PCB.green,
      method: "standoffs",
      holes: corners(20, 10),
      screw: "M3",
      screwLengthMm: 6,
      standoffMm: 5,
      mounting: "4× M3×5 standoffs.",
   },
   "boost-19v-4a": {
      sizeMm: [65, 36, 23],
      shape: "module",
      colour: PCB.blue,
      method: "standoffs",
      holes: corners(28, 14),
      screw: "M3",
      screwLengthMm: 6,
      standoffMm: 5,
      mounting: "4× M3×5 standoffs; inductor and heatsink get warm — not next to the battery.",
   },
   "ldo-3v3": {
      sizeMm: [20, 12, 5],
      shape: "module",
      colour: PCB.blue,
      method: "tape",
      holes: [],
      mounting: "Double-sided foam tape next to the board it feeds, or solder onto its header.",
   },

   // ── Protection
   "switch-fuse-15a": {
      sizeMm: [60, 30, 35],
      shape: "switch",
      colour: "rgb(160,30,30)",
      method: "panel",
      holes: [],
      mounting: "Rocker switch snaps into a 19 × 13 mm cut-out in the side plate; inline blade-fuse holder zip-tied beside it.",
   },
   "switch-fuse-30a": {
      sizeMm: [60, 30, 35],
      shape: "switch",
      colour: "rgb(160,30,30)",
      method: "panel",
      holes: [],
      mounting: "High-current switch in a 19 × 13 mm cut-out; 30 A blade fuse holder zip-tied beside it, 14 AWG leads.",
   },

   // ── Cooling
   "heatsink-passive": {
      sizeMm: [14, 14, 6],
      shape: "box",
      colour: "rgb(150,154,160)",
      method: "tape",
      holes: [],
      mounting: "Thermal tape on the processor; press 10 s.",
   },
   "fan-30mm-5v": {
      sizeMm: [30, 30, 10],
      shape: "fan",
      colour: "rgb(64,66,74)",
      method: "standoffs",
      holes: corners(12, 12),
      screw: "M3",
      screwLengthMm: 12,
      mounting: "4× M3×12 self-tapping screws (24 mm pattern) into a fan bracket above the chip; airflow arrow towards the heatsink.",
   },
   "active-cooler-sbc": {
      sizeMm: [63, 40, 9],
      shape: "fan",
      colour: "rgb(150,154,160)",
      method: "clip",
      holes: [
         [-27, -18],
         [27, 18],
      ],
      mounting: "Peel the thermal pads, press the 2 spring push-pins into the cooler holes until they click, plug the 4-pin fan lead.",
   },
   "fan-heatsink-25w": {
      sizeMm: [70, 55, 30],
      shape: "fan",
      colour: "rgb(150,154,160)",
      method: "standoffs",
      holes: corners(25, 20),
      screw: "M2.5",
      screwLengthMm: 8,
      mounting: "Thermal paste on the module, 4× M2.5×8 spring screws tightened diagonally, fan lead to the FAN header.",
   },
   "cooler-40w-12v": {
      sizeMm: [90, 90, 35],
      shape: "fan",
      colour: "rgb(150,154,160)",
      method: "standoffs",
      holes: corners(35, 35),
      screw: "M3",
      screwLengthMm: 10,
      mounting: "Backplate under the carrier, 4× M3×10 spring screws, 12 V fan lead.",
   },
};

const FRAME_PHYSICAL: Physical = {
   sizeMm: [0, 0, 0],
   shape: "box",
   colour: "rgb(150,156,166)",
   method: "off-board",
   holes: [],
   mounting: "The frame is the base everything else mounts on.",
};

export function getPhysical(partId: string): Physical {
   return PHYSICAL[partId] ?? FRAME_PHYSICAL;
}

export function hasPhysical(partId: string): boolean {
   return partId in PHYSICAL;
}
