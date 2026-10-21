/**
 * Static drawing of the robot: a mecanum mobile base with a servo arm, a
 * wrist depth camera (cyan view cone), a TOF LiDAR scan (amber) and detected
 * objects. Shown before the 3D scene loads, when WebGL is unavailable, and
 * under prefers-reduced-motion.
 */
export function HeroFallback() {
   const camera = { stroke: "var(--camera)" };
   const lidar = { stroke: "var(--lidar)" };
   const fused = { stroke: "var(--fused)" };
   const line = { stroke: "var(--line-strong)" };
   const ink = { stroke: "var(--ink)" };
   const solid = { ...ink, fill: "var(--surface-raised)" };

   const wheel = (cx: number, cy: number, r: number, key: string) => (
      <g key={key}>
         <circle cx={cx} cy={cy} r={r} style={solid} strokeWidth="2" />
         <circle
            cx={cx}
            cy={cy}
            r={r * 0.4}
            style={{ ...ink, fill: "var(--background)" }}
            strokeWidth="1.5"
         />
         {/* mecanum rollers */}
         {[-0.6, -0.2, 0.2, 0.6].map((o) => (
            <line
               key={o}
               x1={cx + o * r - r * 0.25}
               y1={cy - r * 0.8}
               x2={cx + o * r + r * 0.25}
               y2={cy + r * 0.8}
               style={ink}
               strokeWidth="1"
               opacity="0.55"
            />
         ))}
      </g>
   );

   return (
      <svg
         viewBox="0 0 400 400"
         className="hero-fallback absolute inset-0 size-full"
         role="img"
         aria-label="Illustration of the mecanum-wheeled robot with its arm, a wrist camera view in cyan, a LiDAR scan in amber and detected objects in bounding boxes"
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

         {/* LiDAR scan (amber): range rings and the sweep */}
         <g style={lidar}>
            {[
               [70, 20],
               [125, 36],
               [180, 52],
            ].map(([rx, ry]) => (
               <ellipse key={rx} cx="215" cy="300" rx={rx} ry={ry} strokeWidth="1" opacity="0.45" />
            ))}
            <path
               d="M215 300 L395 300 A180 52 0 0 0 360 269 Z"
               style={{ ...lidar, fill: "color-mix(in oklch, var(--lidar) 14%, transparent)" }}
               strokeWidth="0.75"
            />
            <path d="M215 300 L395 300" strokeWidth="2" />
         </g>

         {/* far-side wheels */}
         {wheel(122, 292, 19, "far-rear")}
         {wheel(232, 292, 19, "far-front")}

         {/* chassis */}
         <path d="M70 272 L96 256 L258 256 L232 272 Z" style={solid} strokeWidth="2" />
         <path d="M232 272 L258 256 L258 290 L232 306 Z" style={solid} strokeWidth="2" />
         <rect x="70" y="272" width="162" height="34" style={solid} strokeWidth="2" />
         {/* rear electronics deck (Jetson) */}
         <path d="M84 256 L84 226 L146 226 L146 256" style={solid} strokeWidth="2" />
         <rect x="98" y="236" width="34" height="8" style={{ fill: "var(--fused)" }} />
         {/* TOF LiDAR on the front of the deck */}
         <rect x="204" y="244" width="24" height="12" rx="2" style={solid} strokeWidth="1.5" />
         <rect x="204" y="244" width="24" height="3" style={{ fill: "var(--lidar)" }} />

         {/* near-side wheels */}
         {wheel(98, 308, 22, "near-rear")}
         {wheel(206, 308, 22, "near-front")}

         {/* arm on its turret */}
         <ellipse cx="175" cy="255" rx="22" ry="7" style={solid} strokeWidth="2" />
         <g style={ink} strokeWidth="9" opacity="0.9">
            <path d="M175 252 L175 214 L196 170 L246 156" />
         </g>
         <g style={{ ...ink, stroke: "var(--surface-raised)" }} strokeWidth="5">
            <path d="M175 252 L175 214 L196 170 L246 156" />
         </g>
         <g style={{ fill: "var(--surface-raised)", ...ink }} strokeWidth="2">
            <circle cx="175" cy="214" r="7" />
            <circle cx="196" cy="170" r="7" />
            <circle cx="246" cy="156" r="6" />
         </g>
         {/* gripper */}
         <path
            d="M246 156 L270 172 M262 162 L282 168 M262 162 L274 184"
            style={ink}
            strokeWidth="3"
         />

         {/* wrist depth camera and its view (cyan) */}
         <rect
            x="248"
            y="140"
            width="24"
            height="9"
            rx="2"
            transform="rotate(32 260 144)"
            style={solid}
            strokeWidth="1.5"
         />
         <path
            d="M266 150 L388 222 L326 268 Z"
            style={{ ...camera, fill: "color-mix(in oklch, var(--camera) 8%, transparent)" }}
            strokeWidth="1"
         />
         <path d="M266 150 L356 245" style={camera} strokeWidth="1" opacity="0.6" />

         {/* detected objects */}
         <g strokeWidth="1.25">
            <rect x="300" y="236" width="24" height="28" rx="3" style={solid} />
            <rect x="290" y="226" width="44" height="48" style={fused} />
            <rect x="334" y="300" width="32" height="22" rx="2" style={solid} />
            <rect x="324" y="290" width="52" height="42" style={fused} />
         </g>
         {/* textLength keeps each label inside its tag whatever monospace font loads */}
         <g fontFamily="var(--font-mono), monospace" fontSize="10">
            <rect x="262" y="212" width="112" height="14" style={{ fill: "var(--fused)" }} />
            <text
               x="266"
               y="222"
               textLength="104"
               lengthAdjust="spacingAndGlyphs"
               style={{ fill: "var(--on-accent)" }}
            >
               cup 0.91 · 0.82 m
            </text>
            <rect x="284" y="276" width="112" height="14" style={{ fill: "var(--fused)" }} />
            <text
               x="288"
               y="286"
               textLength="104"
               lengthAdjust="spacingAndGlyphs"
               style={{ fill: "var(--on-accent)" }}
            >
               box 0.87 · 1.10 m
            </text>
         </g>
      </svg>
   );
}
