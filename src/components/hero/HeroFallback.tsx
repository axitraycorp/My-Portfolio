/**
 * Static drawing of the robot scene: arm, cyan camera frustum, amber radar
 * sweep and detected objects. Shown before the 3D scene loads, when WebGL is
 * unavailable, and under prefers-reduced-motion.
 */
export function HeroFallback() {
   const camera = { stroke: "var(--camera)" };
   const radar = { stroke: "var(--radar)" };
   const fused = { stroke: "var(--fused)" };
   const line = { stroke: "var(--line-strong)" };
   const ink = { stroke: "var(--ink)" };

   return (
      <svg
         viewBox="0 0 400 400"
         className="hero-fallback absolute inset-0 size-full"
         role="img"
         aria-label="Illustration of the robot arm with a camera field of view in cyan, a radar sweep in amber and detected objects in bounding boxes"
         fill="none"
         strokeLinecap="round"
         strokeLinejoin="round"
      >
         {/* floor grid in perspective */}
         <g style={line} strokeWidth="0.75" opacity="0.6">
            {[250, 275, 305, 340, 380].map((y) => (
               <line key={y} x1="0" y1={y} x2="400" y2={y} />
            ))}
            {[-200, -100, 0, 100, 200, 300, 400, 500, 600].map((x) => (
               <line key={x} x1="200" y1="230" x2={x} y2="400" />
            ))}
         </g>

         {/* radar sweep (amber) */}
         <path
            d="M150 330 L60 250 A130 60 0 0 1 250 250 Z"
            style={{ ...radar, fill: "color-mix(in oklch, var(--radar) 10%, transparent)" }}
            strokeWidth="1"
         />
         <path d="M150 330 L235 255" style={radar} strokeWidth="2" />
         <path d="M95 280 A75 35 0 0 1 205 280" style={radar} strokeWidth="0.75" opacity="0.6" />

         {/* camera frustum (cyan) */}
         <g style={camera} strokeWidth="1">
            <path
               d="M165 300 L290 205 L330 280 Z"
               style={{ ...camera, fill: "color-mix(in oklch, var(--camera) 8%, transparent)" }}
            />
            <path d="M165 300 L300 170" opacity="0.6" />
         </g>

         {/* arm */}
         <g style={ink} strokeWidth="2.5">
            <ellipse
               cx="150"
               cy="330"
               rx="34"
               ry="10"
               style={{ ...ink, fill: "var(--surface-raised)" }}
            />
            <path d="M150 330 L150 300 L118 205 L215 150 L240 175" />
            <path d="M240 175 L252 168 M240 175 L250 188" strokeWidth="2" />
         </g>
         <g style={{ fill: "var(--surface-raised)", ...ink }} strokeWidth="2">
            <circle cx="150" cy="300" r="7" />
            <circle cx="118" cy="205" r="7" />
            <circle cx="215" cy="150" r="6" />
         </g>

         {/* detected objects */}
         <g strokeWidth="1.25">
            <rect
               x="268"
               y="232"
               width="26"
               height="30"
               rx="3"
               style={{ ...ink, fill: "var(--surface-raised)" }}
            />
            <rect x="258" y="220" width="46" height="52" style={fused} strokeDasharray="0" />
            <rect
               x="312"
               y="300"
               width="34"
               height="24"
               rx="2"
               style={{ ...ink, fill: "var(--surface-raised)" }}
            />
            <rect x="302" y="290" width="54" height="44" style={fused} />
         </g>
         <g fontFamily="var(--font-mono), monospace" fontSize="10">
            <rect x="258" y="206" width="104" height="14" style={{ fill: "var(--fused)" }} />
            <text x="262" y="216" style={{ fill: "var(--on-accent)" }}>
               cup 0.91 · 0.82 m
            </text>
            <rect x="302" y="276" width="96" height="14" style={{ fill: "var(--fused)" }} />
            <text x="306" y="286" style={{ fill: "var(--on-accent)" }}>
               box 0.87 · 1.10 m
            </text>
         </g>
      </svg>
   );
}
