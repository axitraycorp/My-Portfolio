import type { Part, PartCategory, Port } from "../types";
import { computers, controllers } from "./brains";
import { motorDrivers, motors, servoDrivers, servos } from "./actuation";
import { sensors } from "./sensors";
import { batteries, cooling, protection, regulators } from "./power";
import { frames } from "./frames";

export const PARTS: Part[] = [
   ...frames,
   ...controllers,
   ...computers,
   ...motorDrivers,
   ...motors,
   ...servoDrivers,
   ...servos,
   ...sensors,
   ...batteries,
   ...regulators,
   ...protection,
   ...cooling,
];

const byId = new Map(PARTS.map((p) => [p.id, p]));

export function getPart(id: string): Part | undefined {
   return byId.get(id);
}

export function getPort(partId: string, portId: string): Port | undefined {
   return byId.get(partId)?.ports.find((p) => p.id === portId);
}

export const CATEGORY_LABELS: Record<PartCategory, string> = {
   frame: "Frame / chassis",
   controller: "Controller (MCU)",
   compute: "Computer (Linux)",
   accelerator: "AI accelerator",
   "motor-driver": "Motor driver",
   "servo-driver": "Servo controller",
   motor: "Drive motors",
   servo: "Servos",
   camera: "Cameras",
   sensor: "Sensors (non-camera)",
   battery: "Power source",
   regulator: "Regulators",
   protection: "Protection",
   cooling: "Cooling",
};

export const CATEGORY_ORDER: PartCategory[] = [
   "frame",
   "battery",
   "protection",
   "regulator",
   "controller",
   "compute",
   "accelerator",
   "cooling",
   "motor-driver",
   "motor",
   "servo-driver",
   "servo",
   "camera",
   "sensor",
];
