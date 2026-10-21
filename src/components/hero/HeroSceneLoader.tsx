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
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const low = isLowPower();
      setLowPower(low);

      // Creating a WebGL context is expensive, so only probe when about to mount
      const start = () => {
         if (supportsWebGL()) setEnabled(true);
      };
      let idleId: number | undefined;
      let timeoutId: number | undefined;
      const schedule = () => {
         if (typeof window.requestIdleCallback === "function")
            idleId = window.requestIdleCallback(start, { timeout: 2500 });
         else timeoutId = window.setTimeout(start, 1200);
      };

      // Phones and low-power devices fetch three.js only once the visitor
      // interacts, so parsing it never competes with the first render.
      const INTERACTION = ["pointerdown", "touchstart", "scroll", "keydown"] as const;
      const onInteract = () => {
         INTERACTION.forEach((e) => window.removeEventListener(e, onInteract));
         schedule();
      };

      if (low) {
         INTERACTION.forEach((e) =>
            window.addEventListener(e, onInteract, { passive: true, once: true })
         );
      } else if (document.readyState === "complete") schedule();
      else window.addEventListener("load", schedule, { once: true });

      return () => {
         INTERACTION.forEach((e) => window.removeEventListener(e, onInteract));
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
