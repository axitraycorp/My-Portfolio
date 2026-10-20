"use client";

import { useEffect, useRef, useState } from "react";
import type { MetricValue as Value } from "@/content/profile";

/**
 * A metric value. "measuring" shows a scanning shimmer; real numbers count up
 * from zero the first time they scroll into view (instant under reduced motion).
 */
export function MetricValue({
   value,
   unit,
   precision,
}: {
   value: Value;
   unit: string;
   precision: number;
}) {
   const ref = useRef<HTMLSpanElement>(null);
   const [shown, setShown] = useState<number | null>(null);

   useEffect(() => {
      if (value === "measuring") return;
      const el = ref.current;
      if (!el) return;
      if (
         window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
         !("IntersectionObserver" in window)
      ) {
         setShown(value);
         return;
      }
      let frame = 0;
      setShown(0);
      const observer = new IntersectionObserver(
         ([entry]) => {
            if (!entry.isIntersecting) return;
            observer.disconnect();
            const start = performance.now();
            const duration = 900;
            const tick = (now: number) => {
               const t = Math.min(1, (now - start) / duration);
               setShown(value * (1 - Math.pow(1 - t, 3)));
               if (t < 1) frame = requestAnimationFrame(tick);
            };
            frame = requestAnimationFrame(tick);
         },
         { threshold: 0.6 }
      );
      observer.observe(el);
      return () => {
         observer.disconnect();
         cancelAnimationFrame(frame);
      };
   }, [value]);

   if (value === "measuring") {
      return (
         <span className="measuring" aria-label="still measuring">
            measuring
         </span>
      );
   }

   return (
      <span ref={ref} className="font-mono tabular-nums">
         {/* Server and no-JS render the final value; the count-up only runs client-side */}
         {(shown ?? value).toFixed(precision)}
         <span className="ml-[0.4ch] text-muted">{unit}</span>
      </span>
   );
}
