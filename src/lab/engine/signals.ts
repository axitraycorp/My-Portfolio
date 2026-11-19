import type { DataPort, Issue } from "../model/types";
import { key, nodeName, type Graph } from "./graph";
import type { PowerAnalysis } from "./power";

const hex = (n: number) => `0x${n.toString(16).padStart(2, "0")}`;
const NO_LOGIC_CHECK = new Set(["usb", "csi", "pcie", "bus-servo"]);

export function checkSignals(g: Graph, power: PowerAnalysis): Issue[] {
   const issues: Issue[] = [];

   // ── Capacity on each host port ──────────────────────────────────────────
   const byHost = new Map<string, typeof g.data>();
   for (const link of g.data) {
      const k = key(link.host.uid, link.host.port.id);
      byHost.set(k, [...(byHost.get(k) ?? []), link]);
   }
   for (const links of byHost.values()) {
      const { uid, port } = links[0].host;
      const hostNode = g.nodes.get(uid)!;
      const used = links.reduce(
         (s, l) => s + (l.dev.port.uses ?? 1) * g.nodes.get(l.dev.uid)!.inst.count,
         0,
      );
      const cap = (port.capacity ?? 1) * hostNode.inst.count;
      if (used > cap) {
         const advice: Record<string, string> = {
            usb: "Add a powered USB hub.",
            pwm: "Add a PCA9685 servo board or move servos to a servo bus.",
            gpio: "Use a controller with more pins or an I/O expander.",
            uart: "Use a controller with more UARTs, or a USB adapter.",
            csi: "Use a USB camera or a board with more CSI ports.",
            "bus-servo": "Split the chain across two bus adapters.",
            i2c: "Use a second I²C bus or a multiplexer.",
            pcie: "Only one accelerator fits this slot.",
         };
         issues.push({
            id: `capacity:${key(uid, port.id)}`,
            severity: "error",
            category: "bus",
            title: `${nodeName(hostNode)}: ${used} ${port.protocol.toUpperCase()} connections on ${cap} available`,
            detail: `"${port.label}" supports ${cap}. ${advice[port.protocol] ?? ""}`,
            uids: [uid, ...links.map((l) => l.dev.uid)],
            wireIds: links.map((l) => l.wire.id),
         });
      }

      // I²C address conflicts on this bus
      if (port.protocol === "i2c") {
         const seen = new Map<number, string[]>();
         for (const l of links) {
            const devNode = g.nodes.get(l.dev.uid)!;
            const addr = devNode.inst.i2cAddress ?? l.dev.port.i2cAddress;
            if (addr === undefined) continue;
            const owners = seen.get(addr) ?? [];
            for (let i = 0; i < devNode.inst.count; i++) owners.push(l.dev.uid);
            seen.set(addr, owners);
         }
         for (const [addr, owners] of seen) {
            if (owners.length < 2) continue;
            const names = [...new Set(owners)].map((u) => nodeName(g.nodes.get(u)!));
            issues.push({
               id: `i2c-conflict:${key(uid, port.id)}:${addr}`,
               severity: "error",
               category: "bus",
               title: `I²C address conflict at ${hex(addr)}`,
               detail: `${owners.length} devices answer at ${hex(addr)} on ${nodeName(hostNode)} (${names.join(", ")}). Both reply at once and corrupt the bus. Change an address jumper, re-address at boot (XSHUT), or use an I²C multiplexer.`,
               uids: [uid, ...new Set(owners)],
            });
         }
      }
   }

   // ── Logic levels and Linux-only devices on each link ────────────────────
   for (const link of g.data) {
      const hostNode = g.nodes.get(link.host.uid)!;
      const devNode = g.nodes.get(link.dev.uid)!;
      const h = link.host.port;
      const d = link.dev.port;
      const base = { uids: [link.host.uid, link.dev.uid], wireIds: [link.wire.id] };

      if (!NO_LOGIC_CHECK.has(h.protocol)) {
         const drives = d.drivesHost !== false;
         if (drives && d.logic === 5 && h.logic === 3.3 && !h.tolerant5v) {
            issues.push({
               ...base,
               id: `logic-5v-into-3v3:${link.wire.id}`,
               severity: "error",
               category: "logic-level",
               title: `5 V signal into a 3.3 V pin (${nodeName(devNode)} → ${nodeName(hostNode)})`,
               detail: `${nodeName(devNode)} drives its ${d.protocol.toUpperCase()} line at 5 V, but "${h.label}" on ${nodeName(hostNode)} is 3.3 V and not 5 V-tolerant. Over time this kills the pin. Add a level shifter or a resistor divider (e.g. 1 kΩ / 2 kΩ).`,
            });
         } else if (h.logic === 3.3 && d.logic === 5 && !d.accepts3v3) {
            issues.push({
               ...base,
               id: `logic-3v3-low:${link.wire.id}`,
               severity: "warning",
               category: "logic-level",
               title: `3.3 V signal may be too low for ${nodeName(devNode)}`,
               detail: `${nodeName(devNode)} expects 5 V logic; a 3.3 V high may not register reliably. Use a level shifter.`,
            });
         }
      }

      const needsLinux = devNode.part.sensor?.needsLinuxHost;
      if (needsLinux && !hostNode.part.compute?.runsLinux) {
         issues.push({
            ...base,
            id: `needs-linux:${link.wire.id}`,
            severity: "error",
            category: "compute",
            title: `${nodeName(devNode)} needs a Linux computer`,
            detail: `${nodeName(hostNode)} has no operating system or drivers for this sensor, and not enough bandwidth. Connect it to a Raspberry Pi or Jetson.`,
         });
      }

      // Accelerator must sit on a supported host
      const mounts = devNode.part.mountsOn;
      if (mounts && !mounts.includes(hostNode.part.id)) {
         issues.push({
            ...base,
            id: `mount:${link.wire.id}`,
            severity: "error",
            category: "compute",
            title: `${nodeName(devNode)} does not fit ${nodeName(hostNode)}`,
            detail: `It is designed for: ${mounts.join(", ")}.`,
         });
      }
   }

   // ── Devices that nobody talks to ────────────────────────────────────────
   for (const [uid, node] of g.nodes) {
      const devicePorts = node.part.ports.filter(
         (p): p is DataPort => p.kind === "data" && p.role === "device",
      );
      if (devicePorts.length === 0) continue;
      const connected = devicePorts.filter((p) => g.data.some((l) => l.dev.uid === uid && l.dev.port.id === p.id));
      const essential = devicePorts.filter((p) => !(node.part.category === "motor" && p.protocol === "gpio"));
      if (essential.length > 0 && !connected.some((p) => essential.includes(p))) {
         issues.push({
            id: `no-host:${uid}`,
            severity: node.part.sensor ? "warning" : "error",
            category: "wiring",
            title: `${nodeName(node)} isn't connected to any controller`,
            detail: `Connect ${essential.map((p) => `"${p.label}" (${p.protocol.toUpperCase()})`).join(" or ")} to a controller or computer, otherwise nothing can ${
               node.part.sensor ? "read it" : "command it"
            }.`,
            uids: [uid],
         });
      }
      if (node.part.category === "motor" && node.part.motor?.encoder) {
         const enc = devicePorts.find((p) => p.protocol === "gpio");
         if (enc && !connected.includes(enc)) {
            issues.push({
               id: `encoder-unused:${uid}`,
               severity: "info",
               category: "wiring",
               title: `${nodeName(node)}: encoder not connected`,
               detail: "Without encoder feedback there is no closed-loop speed control or odometry — wheels will drift.",
               uids: [uid],
            });
         }
      }
   }

   // ── Motors and their drivers ────────────────────────────────────────────
   const byDriverPort = new Map<string, typeof g.motor>();
   for (const ml of g.motor) {
      const k = key(ml.driver.uid, ml.driver.port.id);
      byDriverPort.set(k, [...(byDriverPort.get(k) ?? []), ml]);
   }
   for (const links of byDriverPort.values()) {
      const { uid, port } = links[0].driver;
      const drv = g.nodes.get(uid)!;
      const motors = links.reduce((s, l) => s + g.nodes.get(l.motor.uid)!.inst.count, 0);
      const channels = (port.channels ?? 1) * drv.inst.count;
      if (motors > channels) {
         issues.push({
            id: `motor-channels:${key(uid, port.id)}`,
            severity: "error",
            category: "wiring",
            title: `${nodeName(drv)}: ${motors} motors on ${channels} channels`,
            detail: "Each motor needs its own driver channel. Paralleled motors can't be steered independently and overload the channel. Add another driver.",
            uids: [uid, ...links.map((l) => l.motor.uid)],
         });
      }
      const supply = port.supply ? power.inputRange.get(key(uid, port.supply)) : undefined;
      for (const l of links) {
         const mot = g.nodes.get(l.motor.uid)!;
         const stall = l.motor.port.current;
         if (stall > port.current) {
            issues.push({
               id: `driver-current:${l.wire.id}`,
               severity: stall > port.current * 1.6 ? "error" : "warning",
               category: "power",
               title: `${nodeName(drv)} is too small for ${nodeName(mot)}`,
               detail: `Each motor can pull ${stall} A at stall; the driver is rated ${port.current} A per channel. It will overheat or trip when the robot pushes or climbs. Use a bigger driver.`,
               uids: [uid, l.motor.uid],
               wireIds: [l.wire.id],
            });
         }
         if (supply) {
            const rated = l.motor.port.voltage;
            if (supply.max > rated * 1.35) {
               issues.push({
                  id: `motor-overvolt:${l.wire.id}`,
                  severity: supply.max > rated * 1.8 ? "error" : "warning",
                  category: "power",
                  title: `${nodeName(mot)} over-driven at ${supply.max} V`,
                  detail: `Rated ${rated} V. Running far above that overheats the windings and wears the gearbox. Limit PWM duty in firmware or use a lower-voltage supply.`,
                  uids: [uid, l.motor.uid],
                  wireIds: [l.wire.id],
               });
            } else if (supply.nominal < rated * 0.6) {
               issues.push({
                  id: `motor-undervolt:${l.wire.id}`,
                  severity: "warning",
                  category: "mechanical",
                  title: `${nodeName(mot)} under-powered at ${supply.nominal} V`,
                  detail: `Rated ${rated} V — at ${supply.nominal} V it has roughly ${Math.round(
                     (supply.nominal / rated) * 100,
                  )} % of its speed and torque.`,
                  uids: [uid, l.motor.uid],
               });
            }
         }
      }
   }

   // Motors with no driver at all
   for (const [uid, node] of g.nodes) {
      if (node.part.category !== "motor") continue;
      if (!g.motor.some((l) => l.motor.uid === uid)) {
         issues.push({
            id: `motor-no-driver:${uid}`,
            severity: "error",
            category: "wiring",
            title: `${nodeName(node)} not connected to a motor driver`,
            detail: "Wire the motor terminals to a driver's motor output (H-bridge or robot control board).",
            uids: [uid],
         });
      }
   }

   return issues;
}
