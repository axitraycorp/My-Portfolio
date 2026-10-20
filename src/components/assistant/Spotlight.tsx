"use client";

import { useEffect, useState } from "react";
import { BoundingBox } from "@/components/hud/BoundingBox";
import type { Highlight } from "./run-tool";

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 8;

/**
 * Dims the page except the highlighted element and draws a BoundingBox around
 * it. Tracks the element through scroll and resize. Pointer events pass
 * through, so the page stays usable.
 */
export function Spotlight({ highlight }: { highlight: Highlight | null }) {
   const [rect, setRect] = useState<Rect | null>(null);
   const [section, setSection] = useState<string | undefined>();

   useEffect(() => {
      if (!highlight) {
         setRect(null);
         return;
      }
      const el = document.getElementById(highlight.elementId);
      if (!el) {
         setRect(null);
         return;
      }
      setSection(el.closest("section[id]")?.id);

      let frame = 0;
      const measure = () => {
         cancelAnimationFrame(frame);
         frame = requestAnimationFrame(() => {
            const r = el.getBoundingClientRect();
            setRect({
               top: r.top - PAD,
               left: r.left - PAD,
               width: r.width + PAD * 2,
               height: r.height + PAD * 2,
            });
         });
      };
      measure();
      window.addEventListener("scroll", measure, { passive: true, capture: true });
      window.addEventListener("resize", measure);
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      return () => {
         cancelAnimationFrame(frame);
         window.removeEventListener("scroll", measure, { capture: true });
         window.removeEventListener("resize", measure);
         observer.disconnect();
      };
   }, [highlight]);

   if (!highlight || !rect) return null;

   return (
      <div
         className="spotlight"
         data-testid="spotlight"
         data-target={highlight.elementId}
         data-section={section}
         aria-hidden="true"
      >
         <div
            className="spotlight__hole"
            style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
         >
            <BoundingBox key={highlight.elementId} label={highlight.label} channel="fused" />
         </div>
      </div>
   );
}
