"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Layout, StepId } from "../assembly/layout";
import type { Environment } from "../engine/environments";
import type { TestVerdict } from "../model/types";
import type { SceneWire } from "./scene/LabScene";

// three.js loads in its own chunk, only once the viewer is on screen
const LabScene = dynamic(() => import("./scene/LabScene"), { ssr: false, loading: () => null });

type Props = {
   layout: Layout;
   env: Environment;
   verdict: TestVerdict;
   moving: boolean;
   robotName: string;
   assembly?: { stage: StepId; replay: number; title: string } | null;
   wires?: SceneWire[];
   highlight?: string[];
};

function supportsWebGL(): boolean {
   try {
      const canvas = document.createElement("canvas");
      return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
   } catch {
      return false;
   }
}

export function SceneView({ layout, env, verdict, moving, robotName, assembly, wires, highlight }: Props) {
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
                  wires={wires}
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
         <figcaption className="text-small text-muted">
            {assembly
               ? `Assembly: ${assembly.title}. Parts from earlier steps are in place; this step's parts move in, then their screws.`
               : `${robotName} in “${env.name}” — ${status}.`}{" "}
            Drag to orbit.
         </figcaption>
      </figure>
   );
}
