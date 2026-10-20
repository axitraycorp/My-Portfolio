"use client";

import { useEffect } from "react";
import { BOOT_KEY } from "@/lib/theme";

const LINES: { text: string; channel?: "camera" | "radar" | "fused" }[] = [
   { text: "initialising sensors..." },
   { text: "camera ok", channel: "camera" },
   { text: "radar ok", channel: "radar" },
   { text: "fusion online", channel: "fused" },
];

/**
 * Terminal-style boot overlay. Visibility and timing are pure CSS keyed on
 * html[data-boot="play"], which the head script sets only on the first visit
 * this session with motion allowed. This component just records the visit and
 * clears the flag once the sequence (≈1.35 s) has finished.
 */
export function BootSequence() {
   useEffect(() => {
      const root = document.documentElement;
      if (root.dataset.boot !== "play") return;
      try {
         sessionStorage.setItem(BOOT_KEY, "1");
      } catch {
         // storage unavailable: the sequence may replay, which is harmless
      }
      const timer = window.setTimeout(() => delete root.dataset.boot, 1500);
      return () => window.clearTimeout(timer);
   }, []);

   return (
      <div className="boot" aria-hidden="true">
         <div className="boot__terminal">
            {LINES.map((line, i) => (
               <p
                  key={line.text}
                  className="boot__line"
                  data-channel={line.channel}
                  style={{ "--i": i, "--n": line.text.length + 2 } as React.CSSProperties}
               >
                  <span className="boot__prompt">&gt; </span>
                  {line.text}
               </p>
            ))}
         </div>
      </div>
   );
}
