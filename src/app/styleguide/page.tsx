import type { Metadata } from "next";
import { HudFrame } from "@/components/hud/HudFrame";
import { TopicLabel } from "@/components/hud/TopicLabel";
import { StatusPill } from "@/components/hud/StatusPill";
import { BoundingBox } from "@/components/hud/BoundingBox";
import { ThemeToggle } from "@/components/hud/ThemeToggle";

export const metadata: Metadata = {
   title: "Styleguide",
   robots: { index: false, follow: false },
};

const COLORS = [
   ["background", "Page background"],
   ["surface", "Cards, panels"],
   ["surface-raised", "Raised elements"],
   ["ink", "Primary text"],
   ["muted", "Secondary text"],
   ["line", "Hairlines"],
   ["line-strong", "Frames, borders"],
   ["camera", "Camera · cyan"],
   ["lidar", "LiDAR · amber"],
   ["fused", "Fused · violet"],
   ["success", "Done"],
   ["warning", "Warnings, recording"],
] as const;

const TYPE = [
   ["display", "--step-5", "Robots that see"],
   ["h1", "--step-4", "Camera–LiDAR fusion"],
   ["h2", "--step-3", "Build log"],
   ["h3", "--step-2", "Hardware bring-up"],
   ["lead", "--step-1", "A lead paragraph introduces a section."],
   ["body", "--step-0", "Body text for reading. Calm, clear, specific."],
   ["small", "--step--1", "Small text for secondary details."],
   ["caption", "--step--2", "/caption/mono_label"],
] as const;

const SPACE = ["3xs", "2xs", "xs", "s", "m", "l", "xl", "2xl"] as const;

function ThemePanel({ theme }: { theme: "dark" | "light" }) {
   return (
      <div data-theme={theme} className="styleguide-panel">
         <p className="mono-caps">data-theme=&quot;{theme}&quot;</p>

         <h2 className="mt-m font-display text-h3 font-medium">Colour tokens</h2>
         <ul className="mt-s grid grid-cols-2 gap-xs sm:grid-cols-3">
            {COLORS.map(([token, use]) => (
               <li key={token} className="flex items-center gap-xs">
                  <span
                     className="size-10 shrink-0 rounded-hud border border-line"
                     style={{ background: `var(--${token})` }}
                  />
                  <span className="min-w-0">
                     <code className="block font-mono text-caption text-ink">--{token}</code>
                     <span className="text-caption text-muted">{use}</span>
                  </span>
               </li>
            ))}
         </ul>

         <h2 className="mt-xl font-display text-h3 font-medium">Components</h2>
         <div className="mt-s grid gap-m">
            <HudFrame surface className="p-m">
               <TopicLabel topic="/robot/status">milestone 1 of 6 in progress</TopicLabel>
               <p className="mt-xs">HudFrame (neutral) with a TopicLabel.</p>
            </HudFrame>
            <div className="grid gap-s sm:grid-cols-3">
               <HudFrame channel="camera" className="p-s">
                  <TopicLabel topic="/camera/image_raw" channel="camera" />
               </HudFrame>
               <HudFrame channel="lidar" className="p-s">
                  <TopicLabel topic="/scan" channel="lidar" />
               </HudFrame>
               <HudFrame channel="fused" className="p-s">
                  <TopicLabel topic="/fusion/tracks" channel="fused" />
               </HudFrame>
            </div>
            <div className="flex flex-wrap gap-xs">
               <StatusPill status="done" />
               <StatusPill status="active" />
               <StatusPill status="planned" />
            </div>
            <div className="flex flex-wrap items-center gap-xs">
               <span className="btn btn-primary">Primary</span>
               <span className="btn btn-ghost">Ghost</span>
               <span className="chip">chip</span>
               <span className="measuring">measuring</span>
               <span className="tbc">to be confirmed</span>
            </div>
            <div className="grid gap-l pt-m sm:grid-cols-3">
               <div className="relative grid h-24 place-items-center rounded-hud bg-surface text-muted">
                  cup
                  <BoundingBox label="cup" confidence={0.91} channel="camera" />
               </div>
               <div className="relative grid h-24 place-items-center rounded-hud bg-surface text-muted">
                  box
                  <BoundingBox label="box" confidence={0.87} channel="lidar" />
               </div>
               <div className="relative grid h-24 place-items-center rounded-hud bg-surface text-muted">
                  track #3
                  <BoundingBox label="fused" confidence={0.95} channel="fused" />
               </div>
            </div>
         </div>
      </div>
   );
}

export default function StyleguidePage() {
   return (
      <div className="section border-t-0">
         <div className="section__inner">
            <div className="flex flex-wrap items-center justify-between gap-s">
               <div>
                  <TopicLabel topic="/design/system" channel="fused" />
                  <h1 className="mt-xs text-h1 font-semibold">Styleguide</h1>
               </div>
               <div className="flex items-center gap-xs">
                  <span className="text-small text-muted">Page theme (circular reveal):</span>
                  <ThemeToggle />
               </div>
            </div>

            <h2 className="mt-xl font-display text-h3 font-medium">Type scale</h2>
            <p className="text-small text-muted">
               Fluid; Space Grotesk (display), Inter (body), JetBrains Mono (labels).
            </p>
            <ul className="mt-s grid gap-s">
               {TYPE.map(([name, token, sample]) => (
                  <li
                     key={name}
                     className="grid gap-3xs border-b border-line pb-s sm:grid-cols-[9rem_1fr] sm:items-baseline"
                  >
                     <code className="font-mono text-caption text-muted">
                        text-{name} · {token}
                     </code>
                     <span
                        style={{ fontSize: `var(${token})` }}
                        className={
                           name === "caption"
                              ? "font-mono"
                              : name === "body" || name === "small" || name === "lead"
                                ? ""
                                : "font-display font-semibold"
                        }
                     >
                        {sample}
                     </span>
                  </li>
               ))}
            </ul>

            <h2 className="mt-xl font-display text-h3 font-medium">Spacing scale</h2>
            <ul className="mt-s grid gap-2xs">
               {SPACE.map((s) => (
                  <li key={s} className="flex items-center gap-s">
                     <code className="w-16 font-mono text-caption text-muted">{s}</code>
                     <span className="h-3 bg-camera" style={{ width: `var(--space-${s})` }} />
                  </li>
               ))}
            </ul>

            <div className="mt-xl grid gap-m lg:grid-cols-2">
               <ThemePanel theme="dark" />
               <ThemePanel theme="light" />
            </div>
         </div>
      </div>
   );
}
