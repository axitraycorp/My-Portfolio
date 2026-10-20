"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// three.js + R3F live in their own chunk, fetched only when the scene mounts.
const RobotScene = dynamic(() => import("./RobotScene"), { ssr: false, loading: () => null });

function supportsWebGL(): boolean {
   try {
      const canvas = document.createElement("canvas");
      return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
   } catch {
      return false;
   }
}

function isLowPower(): boolean {
   const nav = navigator as Navigator & {
      connection?: { saveData?: boolean };
      deviceMemory?: number;
   };
   return (
      window.matchMedia("(pointer: coarse)").matches ||
      window.innerWidth < 768 ||
      (navigator.hardwareConcurrency ?? 8) <= 4 ||
      (nav.deviceMemory ?? 8) <= 4 ||
      nav.connection?.saveData === true
   );
}

/**
 * Mounts the 3D scene over the static SVG once the page is idle. Skipped under
 * prefers-reduced-motion (the SVG is the static version) and without WebGL.
 * Reports visibility so the scene can pause its render loop off-screen.
 */
export function HeroSceneLoader() {
   const ref = useRef<HTMLDivElement>(null);
   const [enabled, setEnabled] = useState(false);
   const [lowPower, setLowPower] = useState(false);
   const [visible, setVisible] = useState(true);
   const [ready, setReady] = useState(false);

   useEffect(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !supportsWebGL()) return;
      setLowPower(isLowPower());

      const start = () => setEnabled(true);
      let idleId: number | undefined;
      let timeoutId: number | undefined;
      const schedule = () => {
         if (typeof window.requestIdleCallback === "function")
            idleId = window.requestIdleCallback(start, { timeout: 2500 });
         else timeoutId = window.setTimeout(start, 1200);
      };
      if (document.readyState === "complete") schedule();
      else window.addEventListener("load", schedule, { once: true });

      return () => {
         window.removeEventListener("load", schedule);
         if (idleId !== undefined) window.cancelIdleCallback(idleId);
         if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      };
   }, []);

   useEffect(() => {
      const el = ref.current;
      if (!el || !enabled) return;
      const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
         threshold: 0.05,
      });
      observer.observe(el);
      return () => observer.disconnect();
   }, [enabled]);

   return (
      <div ref={ref} className="hero-scene absolute inset-0" data-ready={ready ? "" : undefined}>
         {enabled && (
            <RobotScene paused={!visible} lowPower={lowPower} onReady={() => setReady(true)} />
         )}
      </div>
   );
}
