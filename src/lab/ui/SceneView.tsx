"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Layout, StepId } from "../assembly/layout";
import type { Environment } from "../engine/environments";
import type { TestVerdict } from "../model/types";
import type { Cable } from "../assembly/cables";

// three.js loads in its own chunk, only once the viewer is on screen
const LabScene = dynamic(() => import("./scene/LabScene"), { ssr: false, loading: () => null });

type Props = {
   layout: Layout;
   env: Environment;
   verdict: TestVerdict;
   moving: boolean;
   robotName: string;
   assembly?: { stage: StepId; replay: number; title: string } | null;
   cables?: Cable[];
   connected?: Set<string>;
   highlight?: string[];
   /** Errors from the checks: a robot with any stays powered down. */
   errors?: number;
};

const LEGEND: [string, string][] = [
   ["Power", "rgb(225,60,60)"],
   ["Motor", "rgb(240,165,45)"],
   ["I²C", "rgb(80,150,255)"],
   ["UART", "rgb(70,200,120)"],
   ["USB", "rgb(205,208,215)"],
   ["PWM", "rgb(245,215,70)"],
   ["GPIO", "rgb(60,200,200)"],
   ["Servo bus", "rgb(130,150,255)"],
   ["Wrong", "rgb(255,80,200)"],
];

function supportsWebGL(): boolean {
   try {
      const canvas = document.createElement("canvas");
      return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
   } catch {
      return false;
   }
}

export function SceneView({ layout, env, verdict, moving, robotName, assembly, cables, connected, highlight, errors = 0 }: Props) {
   const [showWiring, setShowWiring] = useState(true);
   const ref = useRef<HTMLDivElement>(null);
   const [mount, setMount] = useState(false);
   const [webgl, setWebgl] = useState(true);
   const [animate, setAnimate] = useState(true);
   const [visible, setVisible] = useState(true);

   useEffect(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
      setAnimate(!reduce.matches);
      const onChange = () => setAnimate(!reduce.matches);
      reduce.addEventListener("change", onChange);

      const el = ref.current;
      if (!el) return;
      const observer = new IntersectionObserver(
         ([entry]) => {
            setVisible(entry.isIntersecting);
            if (entry.isIntersecting) {
               if (supportsWebGL()) setMount(true);
               else setWebgl(false);
            }
         },
         { rootMargin: "200px" },
      );
      observer.observe(el);
      return () => {
         observer.disconnect();
         reduce.removeEventListener("change", onChange);
      };
   }, []);

   const status = verdict === "pass" ? "passing" : verdict === "warn" ? "passing with warnings" : "failing";

   return (
      <figure className="flex flex-col gap-2xs">
         <div ref={ref} className="lab-scene">
            {mount && (
               <LabScene
                  layout={layout}
                  scene={env.scene}
                  verdict={verdict}
                  moving={moving}
                  animate={animate && visible}
                  assembly={assembly ? { stage: assembly.stage, replay: assembly.replay } : null}
                  cables={cables}
                  connected={connected}
                  showWiring={showWiring}
                  highlight={highlight}
               />
            )}
            {!mount && (
               <div className="absolute inset-0 grid place-items-center p-s text-center font-mono text-small text-muted">
                  {webgl ? "Loading 3D view…" : "3D view needs WebGL — the checks, plan and tests work without it."}
               </div>
            )}
            <div className="pointer-events-none absolute left-xs top-xs flex flex-wrap gap-2xs">
               <span className="topic-label" data-channel={assembly ? "fused" : "camera"}>
                  <span className="topic-label__topic">{assembly ? `/lab/assembly/${assembly.stage}` : `/lab/env/${env.id}`}</span>
               </span>
            </div>
            {!assembly && (
               <div className="pointer-events-none absolute bottom-xs left-xs">
                  <span className="lab-sev bg-background/80" data-sev={verdict}>
                     {verdict}
                  </span>
               </div>
            )}
         </div>
         {cables && (
            <div className="flex flex-wrap items-center gap-x-s gap-y-3xs font-mono text-caption text-muted">
               {!assembly && (
                  <label className="mr-xs inline-flex min-h-[2.25rem] cursor-pointer items-center gap-2xs text-ink">
                     <input type="checkbox" checked={showWiring} onChange={(e) => setShowWiring(e.target.checked)} className="size-4 accent-[var(--camera)]" />
                     Show wiring
                  </label>
               )}
               {(showWiring || assembly) &&
                  LEGEND.map(([label, colour]) => (
                     <span key={label} className="inline-flex items-center gap-3xs">
                        <span className="inline-block h-[3px] w-3 rounded" style={{ background: colour }} aria-hidden="true" />
                        {label}
                     </span>
                  ))}
            </div>
         )}
         <figcaption className="text-small text-muted">
            {assembly
               ? `Assembly: ${assembly.title}. Parts from earlier steps are in place; this step's parts move in, then their screws.`
               : `${robotName} in “${env.name}” — ${status}.`}{" "}
            {!assembly && errors > 0 && (
               <span className="text-warning">
                  It stays powered down until the {errors} error{errors > 1 ? "s" : ""} in Checks {errors > 1 ? "are" : "is"} fixed — every required port must be wired to the right connector.{" "}
               </span>
            )}
            Drag to orbit.
         </figcaption>
      </figure>
   );
}
