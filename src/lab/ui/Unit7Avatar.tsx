/** Unit-7, the lab guide: a small robot head whose eye and mouth react to state. */
export function Unit7Avatar({ mood, talking }: { mood: "ok" | "warn" | "error"; talking: boolean }) {
   const ring = mood === "error" ? "var(--warning)" : mood === "warn" ? "var(--lidar)" : "var(--camera)";
   return (
      <svg viewBox="0 0 64 64" className="unit7 size-14 flex-none" data-talking={talking ? "" : undefined} aria-hidden="true">
         <line x1="32" y1="4" x2="32" y2="12" stroke="var(--muted)" strokeWidth="2" />
         <circle className="unit7__beacon" cx="32" cy="4" r="3" fill={ring} />
         <rect x="10" y="12" width="44" height="38" rx="10" fill="var(--surface-raised)" stroke="var(--line-strong)" strokeWidth="1.5" />
         <rect x="5" y="25" width="5" height="12" rx="2" fill="var(--line-strong)" />
         <rect x="54" y="25" width="5" height="12" rx="2" fill="var(--line-strong)" />
         <circle cx="32" cy="29" r="10" fill="var(--background)" stroke={ring} strokeWidth="2" />
         <g className="unit7__eye">
            <circle cx="32" cy="29" r="4.5" fill={ring} />
            <circle cx="33.5" cy="27.5" r="1.4" fill="white" opacity="0.85" />
         </g>
         <g className="unit7__mouth" fill={ring}>
            {[24, 29, 34, 39].map((x, i) => (
               <rect key={x} x={x} y="42" width="3" height="3" rx="1" style={{ animationDelay: `${i * 90}ms` }} />
            ))}
         </g>
         <rect x="22" y="50" width="20" height="6" rx="2" fill="var(--line-strong)" />
      </svg>
   );
}
