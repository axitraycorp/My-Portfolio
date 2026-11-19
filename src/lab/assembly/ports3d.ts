import type { Physical } from "../model/physical";
import type { Part, Port } from "../model/types";
import type { Vec3 } from "./frames";

/**
 * Where each port's connector sits on a part, in the part's own frame (mm):
 * origin at the centre of its mounting face, x along its length, y up.
 * Boards: power on the −x edge, motor terminals on the +x edge, signals
 * along the +z edge (spilling onto −z). Motors and servos: on their leads.
 */

const spread = (n: number, span: number) => Array.from({ length: n }, (_, i) => -span / 2 + (span * (i + 1)) / (n + 1));

const kindOf = (p: Port) => (p.kind === "power-in" || p.kind === "power-out" ? "power" : p.kind === "motor" ? "motor" : "data");

export function portOffsets(part: Part, ph: Physical): Map<string, Vec3> {
   const out = new Map<string, Vec3>();
   const [L, W, H] = ph.sizeMm;
   const ports = part.ports;
   const base = ph.standoffMm ?? 0;
   const put = (list: Port[], at: (i: number, n: number) => Vec3) => list.forEach((p, i) => out.set(p.id, at(i, list.length)));

   switch (ph.shape) {
      case "board":
      case "module": {
         const y = base + 1.6 + 3;
         const power = ports.filter((p) => kindOf(p) === "power");
         const motor = ports.filter((p) => kindOf(p) === "motor");
         const data = ports.filter((p) => kindOf(p) === "data");
         const front = data.slice(0, Math.ceil(data.length / 2));
         const back = data.slice(front.length);
         put(power, (i, n) => [-L / 2 + 3, y, spread(n, W - 6)[i]]);
         put(motor, (i, n) => [L / 2 - 3, y, spread(n, W - 6)[i]]);
         put(front, (i, n) => [spread(n, L - 10)[i], y, W / 2 - 3]);
         put(back, (i, n) => [spread(n, L - 10)[i], y, -W / 2 + 3]);
         break;
      }
      case "battery":
         put(ports, (i) => [L / 2 + 24, H * 0.6, i * 6 - 3]);
         break;
      case "switch":
         ports.forEach((p) => out.set(p.id, p.kind === "power-in" ? [-L * 0.22, H * 0.5, 0] : [L * 0.35 + 9, 16, 0]));
         break;
      case "servo":
         // One lead out of the case end carries power and signal
         put(ports, (i, n) => [L / 2 + 2, H * 0.25, spread(n, 6)[i]]);
         break;
      case "motor":
         // Terminals on the back of the can; encoder header above them
         ports.forEach((p) => out.set(p.id, kindOf(p) === "motor" ? [0, 0, -L / 2 - 3] : [0, ph.sizeMm[2] / 2 + 2, -L / 2 - 1]));
         break;
      case "puck":
         put(ports, (i, n) => [-L / 2 - 2, base + H * 0.3, spread(n, 16)[i]]);
         break;
      case "camera":
      case "sonar":
         put(ports, (i, n) => [spread(n, L * 0.6)[i], base + H / 2, -(ph.shape === "sonar" ? 1 : W / 2) - 2]);
         break;
      case "fan":
         put(ports, (i, n) => [L / 2, H / 2, spread(n, 8)[i]]);
         break;
      default: {
         const ins = ports.filter((p) => p.kind === "power-in");
         const rest = ports.filter((p) => p.kind !== "power-in");
         put(ins, (i, n) => [-L / 2 - 2, H / 2, spread(n, W - 4)[i]]);
         put(rest, (i, n) => [L / 2 + 2, H / 2, spread(n, W - 4)[i]]);
      }
   }
   return out;
}
