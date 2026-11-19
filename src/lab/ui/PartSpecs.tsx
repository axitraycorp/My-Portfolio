import type { Part } from "../model/types";
import { getPhysical } from "../model/physical";
import { PartDrawing } from "./PartDrawing";
import { portSummary } from "./ports";

/** Datasheet-style detail for one catalogue part. */
export function PartSpecs({ part }: { part: Part }) {
   const ph = getPhysical(part.id);
   const rows: [string, string][] = [
      ...(ph.sizeMm[0] > 0 ? ([["Size", `${ph.sizeMm.join(" × ")} mm (L × W × H)`]] as [string, string][]) : []),
      ["Mass", `${part.massG} g`],
      ["Price", `≈ $${part.priceUsd}`],
   ];
   const c = part.compute;
   if (c) {
      rows.push(
         ["CPU", c.cpu],
         ["Chipset", c.chipset],
         ["GPU", c.gpu ?? "—"],
         ["Memory", c.ram],
         ["AI compute", c.tops > 0 ? `${c.tops} TOPS (INT8)` : "none (CPU only)"],
         ["CPU score", `${c.cpuScore}× a Raspberry Pi 4`],
         ["OS", c.runsLinux ? "Linux (ROS 2 capable)" : "Bare-metal firmware"],
         ["Wireless", c.wifi ? "Wi-Fi / Bluetooth" : "none"],
         ["Full-load heat", `${c.loadWatts} W`],
         ["Throttles at", `${c.throttleC} °C`],
      );
   }
   if (part.cooling) rows.push(["Cooling", `removes ${part.cooling.capacityWatts} W at 25 °C${part.cooling.noiseDb ? ` · ${part.cooling.noiseDb} dB` : ""}`]);
   const b = part.battery;
   if (b) {
      rows.push(
         ["Chemistry", `${b.chemistry} ${b.cells}`],
         ["Capacity", `${b.capacityMah} mAh @ ${b.nominalV} V (${Math.round((b.nominalV * b.capacityMah) / 100) / 10} Wh)`],
         ["Discharge", b.tethered ? "mains powered (tethered)" : `${b.cRating} C continuous`],
      );
   }
   if (part.regulator) rows.push(["Regulator", `${part.regulator.type.toUpperCase()} · ${Math.round(part.regulator.efficiency * 100)} % efficient`]);
   if (part.motor) rows.push(["Motor", `${part.motor.ratedRpm} rpm · stall ${part.motor.stallTorqueKgCm} kg·cm${part.motor.encoder ? " · encoder" : ""}`]);
   if (part.servo) rows.push(["Servo", `${part.servo.stallTorqueKgCm} kg·cm @ ${part.servo.torqueAtV} V · ${part.servo.control.toUpperCase()}${part.servo.feedback ? " · position feedback" : ""}`]);
   if (part.sensor) rows.push(["Sensor", `${part.sensor.type} → ${part.sensor.provides.join(", ")}${part.sensor.needsLinuxHost ? " · needs Linux host" : ""}`]);
   const f = part.frame;
   if (f) {
      rows.push(
         ["Locomotion", f.locomotion.replace("-", " ")],
         ["Designed for", `${f.motors} drive motors · ${f.servos} servo joints`],
      );
      if (f.reachM) rows.push(["Reach / leg", `${Math.round(f.reachM * 100)} cm`]);
   }
   if (part.mountsOn) rows.push(["Mounts on", part.mountsOn.join(", ")]);

   return (
      <div className="flex flex-col gap-xs">
         <p className="text-small text-muted">{part.description}</p>
         <div className="rounded-hud border border-line bg-background p-2xs">
            <PartDrawing part={part} />
         </div>
         {ph.sizeMm[0] > 0 && (
            <p className="text-small">
               <span className="mono-caps text-muted">Mounting </span>
               {ph.mounting}
            </p>
         )}
         <dl className="lab-dl">
            {rows.map(([k, v]) => (
               <div key={k} className="contents">
                  <dt>{k}</dt>
                  <dd>{v}</dd>
               </div>
            ))}
         </dl>
         <div>
            <p className="mono-caps mb-3xs text-muted">Ports</p>
            <ul className="flex flex-col gap-3xs font-mono text-caption">
               {part.ports.map((p) => (
                  <li key={p.id}>
                     <span className="text-ink">{p.label}</span> <span className="text-muted">— {portSummary(p)}</span>
                  </li>
               ))}
            </ul>
         </div>
      </div>
   );
}
