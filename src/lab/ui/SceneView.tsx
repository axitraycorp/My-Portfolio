"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Environment } from "../engine/environments";
import type { TestVerdict } from "../model/types";
import type { SceneRobot } from "./scene/LabScene";

// three.js loads in its own chunk, only once the viewer is on screen
const LabScene = dynamic(() => import("./scene/LabScene"), { ssr: false, loading: () => null });

type Props = {
   robot: SceneRobot;
   env: Environment;
   verdict: TestVerdict;
   moving: boolean;
   robotName: string;
};

function supportsWebGL(): boolean {
   try {
      const canvas = document.createElement("canvas");
      return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
   } catch {
      return false;
   }
}

export function SceneView({ robot, env, verdict, moving, robotName }: Props) {
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
            {mount && <LabScene robot={robot} scene={env.scene} verdict={verdict} moving={moving} animate={animate && visible} />}
            {!mount && (
               <div className="absolute inset-0 grid place-items-center p-s text-center font-mono text-small text-muted">
                  {webgl ? "Loading 3D view…" : "3D view needs WebGL — the checks and tests below work without it."}
               </div>
            )}
            <div className="pointer-events-none absolute left-xs top-xs flex flex-wrap gap-2xs">
               <span className="topic-label" data-channel="camera">
                  <span className="topic-label__topic">/lab/env/{env.id}</span>
               </span>
            </div>
            <div className="pointer-events-none absolute bottom-xs left-xs">
               <span className="lab-sev bg-background/80" data-sev={verdict}>
                  {verdict}
               </span>
            </div>
         </div>
         <figcaption className="text-small text-muted">
            {robotName} in “{env.name}” — {status}. Drag to orbit.
         </figcaption>
      </figure>
   );
}
