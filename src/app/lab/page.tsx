import type { Metadata } from "next";
import Link from "next/link";
import { HudFrame } from "@/components/hud/HudFrame";
import { TopicLabel } from "@/components/hud/TopicLabel";
import { ARCHETYPES } from "@/lab/model/archetypes";
import { PARTS } from "@/lab/model/catalog";
import { ENVIRONMENTS } from "@/lab/engine/environments";
import { runChecks } from "@/lab/engine";
import { LabAccountBar } from "@/lab/ui/LabAccountBar";

export const metadata: Metadata = {
   title: "Robot Lab",
   description:
      "Design a robot from real-world parts, wire it, and see whether it would work: power, logic levels, buses, heat, torque and nine test environments.",
   alternates: { canonical: "/lab" },
};

const CHECKS = [
   ["Power distribution", "Voltage ranges propagate from the battery through every regulator; each rail is loaded with typical and realistic peak current."],
   ["Wiring faults", "Shorted outputs, back-fed supplies, motors on logic pins, protocol and role mismatches, two hosts on one device."],
   ["Signals", "5 V into 3.3 V pins, I²C address clashes, bus and pin capacity, drivers that can't be controlled at 3.3 V."],
   ["Compute & heat", "CPU, GPU, RAM and AI TOPS per board; heat at full load against the cooling, derated for the test's ambient temperature."],
   ["Mechanics", "Drive torque on slopes and rough ground, servo torque for legs and arms, the right number of motors and joints for the frame."],
   ["Environments", "Ramp, yard, stairs, warehouse SLAM, pick-and-place, heatwave, voice + LLM, one-hour endurance."],
] as const;

export default function LabPage() {
   const cards = ARCHETYPES.map((a) => {
      const report = runChecks(a.template);
      return { ...a, parts: a.template.parts.length, wires: a.template.wires.length, mass: report.stats.massG, cost: report.stats.priceUsd };
   });

   return (
      <div className="mx-auto flex max-w-content flex-col gap-2xl px-gutter py-xl">
         <header className="flex flex-col gap-m">
            <TopicLabel topic="/lab/status" channel="fused">
               online
            </TopicLabel>
            <h1 className="text-h1 font-semibold">Robot Lab</h1>
            <p className="max-w-[62ch] text-lead text-muted">
               Pick a robot, swap its brain, battery, drivers, servos and sensors, and wire it up. The simulator checks every connection the
               way a careful engineer would before power-on — then runs the robot through nine test environments.
            </p>
            <p className="font-mono text-small text-muted">
               {ARCHETYPES.length} robot types · {PARTS.length} parts · {ENVIRONMENTS.length} environments · runs in your browser
            </p>
            <LabAccountBar />
         </header>

         <section aria-labelledby="types-title" className="flex flex-col gap-m">
            <h2 id="types-title" className="text-h2 font-semibold">
               Choose a robot
            </h2>
            <ul className="grid gap-m sm:grid-cols-2 lg:grid-cols-4">
               {cards.map((a) => (
                  <li key={a.id}>
                     <HudFrame surface className="flex h-full flex-col gap-xs p-s">
                        <h3 className="font-display text-lead font-semibold">{a.name}</h3>
                        <p className="text-small text-muted">{a.tagline}</p>
                        <p className="mt-auto font-mono text-caption text-muted">
                           {a.parts} parts · {a.wires} wires · {(a.mass / 1000).toFixed(1)} kg · ≈ ${Math.round(a.cost)}
                        </p>
                        <Link href={`/lab/build?type=${a.id}`} className="btn btn-ghost mt-2xs">
                           Build a {a.name.toLowerCase()}
                        </Link>
                     </HudFrame>
                  </li>
               ))}
            </ul>
         </section>

         <section aria-labelledby="checks-title" className="flex flex-col gap-m">
            <h2 id="checks-title" className="text-h2 font-semibold">
               What gets checked
            </h2>
            <dl className="grid gap-m md:grid-cols-2 lg:grid-cols-3">
               {CHECKS.map(([title, text]) => (
                  <div key={title} className="border-t border-line pt-s">
                     <dt className="font-display text-body font-semibold">{title}</dt>
                     <dd className="mt-3xs text-small text-muted">{text}</dd>
                  </div>
               ))}
            </dl>
            <p className="max-w-[70ch] text-small text-muted">
               Part figures are typical datasheet values for generic components, used for simulation. They are a design aid, not a substitute
               for the real datasheet — always check the actual board before wiring it.
            </p>
         </section>
      </div>
   );
}
