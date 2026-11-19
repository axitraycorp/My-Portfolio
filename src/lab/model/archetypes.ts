import type { ArchetypeId, Build, PartInstance, Wire } from "./types";

export interface Archetype {
   id: ArchetypeId;
   name: string;
   tagline: string;
   description: string;
   frameId: string;
   strengths: string[];
   weaknesses: string[];
   template: Build;
}

/* Template helpers: p("uid", "part-id", count) and w("uid:port", "uid:port"). */
const p = (uid: string, partId: string, count = 1): PartInstance => ({ uid, partId, count });
let wireSeq = 0;
const w = (a: string, b: string): Wire => {
   const [fu, fp] = a.split(":");
   const [tu, tp] = b.split(":");
   wireSeq += 1;
   return { id: `w${wireSeq}`, from: { uid: fu, port: fp }, to: { uid: tu, port: tp } };
};
const build = (name: string, archetype: ArchetypeId, parts: PartInstance[], wires: Wire[]): Build => ({
   name,
   archetype,
   parts,
   wires,
});

export const ARCHETYPES: Archetype[] = [
   {
      id: "mecanum-rover",
      name: "Mecanum rover",
      tagline: "Drives in any direction",
      description: "Four mecanum wheels let it strafe and spin on the spot — ideal for indoor navigation and SLAM.",
      frameId: "frame-mecanum",
      strengths: ["Omnidirectional", "Precise indoor navigation"],
      weaknesses: ["Rough ground", "Steep ramps"],
      template: build(
         "Mecanum SLAM rover",
         "mecanum-rover",
         [
            p("frame", "frame-mecanum"),
            p("bat", "lipo-2s-2200"),
            p("sw", "switch-fuse-15a"),
            p("rcb", "robot-control-board"),
            p("pi", "rpi5-8gb"),
            p("cool", "active-cooler-sbc"),
            p("mot", "micro-metal-7v4-encoder", 4),
            p("lidar", "lidar-2d"),
            p("cam", "usb-webcam"),
         ],
         [
            w("bat:out", "sw:in"),
            w("sw:out", "rcb:vin"),
            w("rcb:5v-out", "pi:usbc"),
            w("pi:gpio-5v", "cool:5v"),
            w("rcb:motors", "mot:m"),
            w("mot:enc", "rcb:enc"),
            w("rcb:usb", "pi:usb"),
            w("lidar:usb", "pi:usb"),
            w("pi:usb-power", "lidar:5v"),
            w("cam:usb", "pi:usb"),
            w("pi:usb-power", "cam:usb5v"),
         ],
      ),
   },
   {
      id: "tank-rover",
      name: "Tank rover",
      tagline: "Tracks for rough ground",
      description: "Skid-steer tracks with strong 12 V motors: rubble, grass and small obstacles.",
      frameId: "frame-tank",
      strengths: ["Rough terrain", "Pushing power"],
      weaknesses: ["Turning wears tracks", "Less efficient"],
      template: build(
         "Arduino tank",
         "tank-rover",
         [
            p("frame", "frame-tank"),
            p("bat", "lipo-3s-2200"),
            p("sw", "switch-fuse-15a"),
            p("buck", "buck-5v-3a"),
            p("mega", "arduino-mega"),
            p("drv", "bts7960", 2),
            p("mot", "geared-370-12v", 2),
            p("us", "hc-sr04"),
            p("imu", "mpu6050"),
         ],
         [
            w("bat:out", "sw:in"),
            w("sw:out", "buck:in"),
            w("buck:out", "mega:usb"),
            w("sw:out", "drv:vm"),
            w("buck:out", "drv:vcc"),
            w("drv:out", "mot:m"),
            w("mega:pwm", "drv:ctrl"),
            w("mot:enc", "mega:gpio"),
            w("mega:5v", "us:vcc"),
            w("us:io", "mega:gpio"),
            w("mega:5v", "imu:vcc"),
            w("imu:i2c", "mega:i2c"),
         ],
      ),
   },
   {
      id: "ackermann-car",
      name: "Ackermann car",
      tagline: "Car-like steering",
      description: "One drive motor and a steering servo — efficient and fast, like a real car.",
      frameId: "frame-ackermann",
      strengths: ["Speed", "Efficiency"],
      weaknesses: ["Can't turn on the spot", "Tight spaces"],
      template: build(
         "ESP32 Ackermann car",
         "ackermann-car",
         [
            p("frame", "frame-ackermann"),
            p("bat", "lipo-3s-2200"),
            p("sw", "switch-fuse-15a"),
            p("buck", "buck-5v-3a"),
            p("ubec", "ubec-6v-10a"),
            p("esp", "esp32-s3"),
            p("drv", "bts7960"),
            p("mot", "geared-370-12v"),
            p("steer", "mg996r"),
            p("imu", "mpu6050"),
         ],
         [
            w("bat:out", "sw:in"),
            w("sw:out", "buck:in"),
            w("sw:out", "ubec:in"),
            w("sw:out", "drv:vm"),
            w("buck:out", "esp:5v"),
            w("buck:out", "drv:vcc"),
            w("esp:3v3", "imu:vcc"),
            w("drv:out", "mot:m"),
            w("esp:pwm", "drv:ctrl"),
            w("esp:pwm", "steer:sig"),
            w("ubec:out", "steer:v"),
            w("imu:i2c", "esp:i2c"),
            w("mot:enc", "esp:gpio"),
         ],
      ),
   },
   {
      id: "robot-arm",
      name: "Robot arm",
      tagline: "6-DOF desktop manipulator",
      description: "A bench arm for pick-and-place, drawing and sorting. Fixed base, tethered power.",
      frameId: "frame-arm-6dof",
      strengths: ["Precision", "Simple power (tethered)"],
      weaknesses: ["Can't move around"],
      template: build(
         "Desktop arm",
         "robot-arm",
         [
            p("frame", "frame-arm-6dof"),
            p("psu", "bench-psu-12v"),
            p("ubec", "ubec-6v-10a"),
            p("buck", "buck-5v-3a"),
            p("uno", "arduino-uno"),
            p("pca", "pca9685"),
            p("big", "ds3218-20kg", 3),
            p("small", "mg996r", 3),
         ],
         [
            w("psu:out", "ubec:in"),
            w("psu:out", "buck:in"),
            w("buck:out", "uno:usb"),
            w("uno:5v", "pca:vcc"),
            w("ubec:out", "big:v"),
            w("ubec:out", "small:v"),
            w("pca:pwm", "big:sig"),
            w("pca:pwm", "small:sig"),
            w("pca:i2c", "uno:i2c"),
         ],
      ),
   },
   {
      id: "mobile-manipulator",
      name: "Mobile manipulator",
      tagline: "Drives, sees and grasps",
      description: "Mecanum base with a 6-DOF arm, depth camera, LiDAR and voice — a fetch robot on a Jetson.",
      frameId: "frame-mobile-manipulator",
      strengths: ["Navigation + manipulation", "On-board AI"],
      weaknesses: ["Power hungry", "Complex"],
      template: build(
         "Jetson mobile manipulator",
         "mobile-manipulator",
         [
            p("frame", "frame-mobile-manipulator"),
            p("bat", "lipo-2s-2200"),
            p("sw", "switch-fuse-30a"),
            p("rcb", "robot-control-board"),
            p("boost", "boost-19v-4a"),
            p("jet", "jetson-orin-nano-8gb"),
            p("fan", "fan-heatsink-25w"),
            p("mot", "micro-metal-7v4-encoder", 4),
            p("arm", "bus-servo-15kg", 6),
            p("cam", "depth-camera-usb"),
            p("lidar", "lidar-2d"),
            p("voice", "voice-module"),
         ],
         [
            w("bat:out", "sw:in"),
            w("sw:out", "rcb:vin"),
            w("sw:out", "boost:in"),
            w("boost:out", "jet:dc"),
            w("jet:gpio-5v", "fan:5v"),
            w("rcb:motors", "mot:m"),
            w("mot:enc", "rcb:enc"),
            w("rcb:servo-power", "arm:v"),
            w("arm:bus", "rcb:bus"),
            w("rcb:usb", "jet:usb"),
            w("cam:usb", "jet:usb"),
            w("lidar:usb", "jet:usb"),
            w("voice:usb", "jet:usb"),
            w("jet:usb-power", "cam:usb5v"),
            w("jet:usb-power", "lidar:5v"),
            w("jet:usb-power", "voice:usb5v"),
         ],
      ),
   },
   {
      id: "robot-dog",
      name: "Robot dog",
      tagline: "12-DOF quadruped",
      description: "Four legs with three joints each. Trots, climbs steps and keeps its balance with an IMU.",
      frameId: "frame-quadruped",
      strengths: ["Steps and uneven ground", "Expressive motion"],
      weaknesses: ["High servo current", "Short runtime"],
      template: build(
         "Pi 5 robot dog",
         "robot-dog",
         [
            p("frame", "frame-quadruped"),
            p("bat", "lipo-3s-2200"),
            p("sw", "switch-fuse-15a"),
            p("ubec", "ubec-6v-10a", 2),
            p("buck", "buck-5v-5a"),
            p("pi", "rpi5-8gb"),
            p("cool", "active-cooler-sbc"),
            p("pca", "pca9685"),
            p("legs", "ds3218-20kg", 12),
            p("cam", "csi-camera-12mp"),
            p("imu", "mpu6050"),
         ],
         [
            w("bat:out", "sw:in"),
            w("sw:out", "ubec:in"),
            w("sw:out", "buck:in"),
            w("buck:out", "pi:usbc"),
            w("pi:gpio-5v", "cool:5v"),
            w("pi:gpio-5v", "pca:vcc"),
            w("pi:gpio-5v", "imu:vcc"),
            w("ubec:out", "legs:v"),
            w("pca:pwm", "legs:sig"),
            w("pca:i2c", "pi:i2c"),
            w("imu:i2c", "pi:i2c"),
            w("cam:csi", "pi:csi"),
         ],
      ),
   },
   {
      id: "hexapod",
      name: "Hexapod spider",
      tagline: "18-DOF six-legged walker",
      description: "Three legs always on the ground: the most stable walker over rough terrain.",
      frameId: "frame-hexapod",
      strengths: ["Stability", "Rough terrain"],
      weaknesses: ["Many servos to power", "Slow"],
      template: build(
         "Bus-servo hexapod",
         "hexapod",
         [
            p("frame", "frame-hexapod"),
            p("bat", "lipo-2s-2200"),
            p("sw", "switch-fuse-30a"),
            p("buck", "buck-5v-3a"),
            p("pi", "rpi5-8gb"),
            p("cool", "active-cooler-sbc"),
            p("adapter", "bus-servo-adapter", 2),
            p("legs", "bus-servo-15kg", 18),
            p("cam", "csi-camera-12mp"),
            p("imu", "mpu6050"),
         ],
         [
            w("bat:out", "sw:in"),
            w("sw:out", "buck:in"),
            w("sw:out", "adapter:vin"),
            w("buck:out", "pi:usbc"),
            w("pi:gpio-5v", "cool:5v"),
            w("pi:gpio-5v", "imu:vcc"),
            w("adapter:bus-power", "legs:v"),
            w("legs:bus", "adapter:bus"),
            w("adapter:usb", "pi:usb"),
            w("cam:csi", "pi:csi"),
            w("imu:i2c", "pi:i2c"),
         ],
      ),
   },
   {
      id: "humanoid",
      name: "Humanoid",
      tagline: "17-DOF biped",
      description: "Walks on two legs, waves its arms and talks back. The hardest robot to power and balance.",
      frameId: "frame-humanoid",
      strengths: ["Human environments", "Interaction"],
      weaknesses: ["Balance", "Joint torque", "Runtime"],
      template: build(
         "Pi 5 humanoid",
         "humanoid",
         [
            p("frame", "frame-humanoid"),
            p("bat", "lipo-3s-2200"),
            p("sw", "switch-fuse-30a"),
            p("buck", "buck-5v-5a"),
            p("pi", "rpi5-8gb"),
            p("cool", "active-cooler-sbc"),
            p("adapter", "bus-servo-adapter", 2),
            p("joints", "bus-servo-35kg", 17),
            p("cam", "csi-camera-12mp"),
            p("imu", "bno055"),
            p("voice", "voice-module"),
         ],
         [
            w("bat:out", "sw:in"),
            w("sw:out", "buck:in"),
            w("sw:out", "adapter:vin"),
            w("buck:out", "pi:usbc"),
            w("pi:gpio-5v", "cool:5v"),
            w("pi:gpio-5v", "imu:vcc"),
            w("adapter:bus-power", "joints:v"),
            w("joints:bus", "adapter:bus"),
            w("adapter:usb", "pi:usb"),
            w("cam:csi", "pi:csi"),
            w("imu:i2c", "pi:i2c"),
            w("voice:usb", "pi:usb"),
            w("pi:usb-power", "voice:usb5v"),
         ],
      ),
   },
];

const byId = new Map(ARCHETYPES.map((a) => [a.id, a]));

export function getArchetype(id: string): Archetype | undefined {
   return byId.get(id as ArchetypeId);
}

/** A fresh, independent copy of an archetype's starter build. */
export function templateFor(id: ArchetypeId): Build {
   const a = byId.get(id);
   if (!a) throw new Error(`Unknown archetype ${id}`);
   return structuredClone(a.template);
}
