import { createContext, useContext, useId } from "react";
import { getPhysical, type Physical } from "../model/physical";
import type { Part } from "../model/types";

/* Dimensioned technical drawing of a part: top view + side (or face) view. */

const ArrowId = createContext("dim-arrow");

const PAD = 26;
const GAP = 34;
const r1 = (n: number) => Math.round(n * 10) / 10;

function Dim({ x1, y1, x2, y2, label, vertical }: { x1: number; y1: number; x2: number; y2: number; label: string; vertical?: boolean }) {
   const arrow = `url(#${useContext(ArrowId)})`;
   const mx = (x1 + x2) / 2;
   const my = (y1 + y2) / 2;
   return (
      <g stroke="var(--muted)" strokeWidth={0.75} fill="var(--muted)">
         <line x1={x1} y1={y1} x2={x2} y2={y2} markerStart={arrow} markerEnd={arrow} />
         <text
            x={vertical ? mx + 4 : mx}
            y={vertical ? my : my + 11}
            fontSize={9}
            stroke="none"
            textAnchor={vertical ? "start" : "middle"}
            dominantBaseline={vertical ? "middle" : "auto"}
            className="font-mono"
         >
            {label}
         </text>
      </g>
   );
}

function Holes({ ph, cx, cy, s, holes }: { ph: Physical; cx: number; cy: number; s: number; holes: [number, number][] }) {
   const d = ph.screw === "M1.6" ? 1.7 : ph.screw === "M2" ? 2.2 : ph.screw === "M2.5" ? 2.7 : ph.screw === "1/4-20" ? 6.4 : 3.2;
   return (
      <g>
         {holes.map(([hx, hy], i) => (
            <g key={i}>
               <circle cx={cx + hx * s} cy={cy + hy * s} r={Math.max(1.6, (d / 2) * s)} fill="var(--background)" stroke="var(--ink)" strokeWidth={0.75} />
               <circle cx={cx + hx * s} cy={cy + hy * s} r={Math.max(2.6, (d / 2) * s + 1.5)} fill="none" stroke="var(--camera)" strokeWidth={0.5} />
            </g>
         ))}
      </g>
   );
}

/** Body outline and details in the top view, centred on (cx, cy). */
function TopBody({ ph, cx, cy, s }: { ph: Physical; cx: number; cy: number; s: number }) {
   const [L, W] = ph.sizeMm;
   const x = cx - (L * s) / 2;
   const y = cy - (W * s) / 2;
   const w = L * s;
   const h = W * s;
   const body = { fill: ph.colour, stroke: "var(--ink)", strokeWidth: 0.75 };
   switch (ph.shape) {
      case "servo": {
         const tabX = Math.max(...ph.holes.map(([hx]) => Math.abs(hx))) + 4;
         return (
            <g>
               <rect x={cx - tabX * s} y={cy - (W * s) / 2 + 1} width={tabX * 2 * s} height={W * s - 2} fill={ph.colour} opacity={0.6} stroke="var(--ink)" strokeWidth={0.5} />
               <rect x={x} y={y} width={w} height={h} rx={2} {...body} />
               <circle cx={x + w * 0.25} cy={cy} r={W * 0.28 * s} fill="rgb(235,235,235)" stroke="var(--ink)" strokeWidth={0.5} />
            </g>
         );
      }
      case "motor":
         return (
            <g>
               <rect x={x} y={y} width={w * 0.45} height={h} {...body} />
               <rect x={x + w * 0.45} y={y + h * 0.05} width={w * 0.55} height={h * 0.9} rx={h * 0.45} fill="rgb(170,172,178)" stroke="var(--ink)" strokeWidth={0.75} />
               <line x1={x - 10} y1={cy} x2={x} y2={cy} stroke="var(--ink)" strokeWidth={2} />
            </g>
         );
      case "puck":
         return (
            <g>
               <rect x={x} y={y} width={w} height={h} rx={w * 0.12} {...body} />
               <circle cx={cx} cy={cy} r={Math.min(w, h) * 0.38} fill="none" stroke="var(--lidar)" strokeWidth={1.5} />
               <path d={`M${cx},${cy - h * 0.42} l-5,8 h10 z`} fill="var(--lidar)" />
            </g>
         );
      case "fan":
         return (
            <g>
               <rect x={x} y={y} width={w} height={h} rx={3} {...body} />
               <circle cx={cx} cy={cy} r={Math.min(w, h) * 0.42} fill="var(--background)" stroke="var(--ink)" strokeWidth={0.5} />
               {[0, 1, 2, 3, 4].map((i) => {
                  const a = (i / 5) * Math.PI * 2;
                  const r = Math.min(w, h) * 0.38;
                  return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r} stroke="var(--muted)" strokeWidth={2} />;
               })}
            </g>
         );
      case "battery":
         return (
            <g>
               <rect x={x} y={y} width={w} height={h} rx={3} {...body} />
               <rect x={x + w * 0.1} y={y + h * 0.25} width={w * 0.5} height={h * 0.5} fill="none" stroke="var(--muted)" strokeWidth={0.5} />
               <line x1={x + w} y1={cy - 3} x2={x + w + 14} y2={cy - 3} stroke="rgb(210,50,50)" strokeWidth={2} />
               <line x1={x + w} y1={cy + 3} x2={x + w + 14} y2={cy + 3} stroke="rgb(30,30,30)" strokeWidth={2} />
            </g>
         );
      case "board":
      case "module":
         return (
            <g>
               <rect x={x} y={y} width={w} height={h} rx={2} {...body} />
               {ph.shape === "board" && w > 60 && (
                  <g>
                     {Array.from({ length: Math.floor((w * 0.7) / 5) }, (_, i) => (
                        <rect key={i} x={x + w * 0.15 + i * 5} y={y + 3} width={3} height={3} fill="rgb(20,20,20)" />
                     ))}
                     <rect x={cx - h * 0.15} y={cy - h * 0.15} width={h * 0.3} height={h * 0.3} fill="rgb(25,25,28)" />
                  </g>
               )}
               {ph.sizeMm[2] > 25 && (
                  <g>
                     {Array.from({ length: 6 }, (_, i) => (
                        <line key={i} x1={x + (w * (i + 1)) / 7} y1={y + h * 0.15} x2={x + (w * (i + 1)) / 7} y2={y + h * 0.85} stroke="rgb(30,30,30)" strokeWidth={2} />
                     ))}
                  </g>
               )}
            </g>
         );
      default:
         return <rect x={x} y={y} width={w} height={h} rx={2} {...body} />;
   }
}

/** Side view (L × H), or for motors the gearbox face (W × H) with its holes. */
function SideBody({ ph, x0, base, s }: { ph: Physical; x0: number; base: number; s: number }) {
   const [L, W, H] = ph.sizeMm;
   const body = { fill: ph.colour, stroke: "var(--ink)", strokeWidth: 0.75 };
   if (ph.shape === "motor") {
      const cx = x0 + (W * s) / 2;
      const cy = base - (H * s) / 2;
      return (
         <g>
            <rect x={x0} y={base - H * s} width={W * s} height={H * s} rx={ph.sizeMm[1] > 30 ? (W * s) / 2 : 3} {...body} />
            <circle cx={cx} cy={cy} r={Math.max(1.5, 2 * s)} fill="var(--ink)" />
            <Holes ph={ph} cx={cx} cy={cy} s={s} holes={ph.holes} />
         </g>
      );
   }
   const standoff = (ph.standoffMm ?? 0) * s;
   const top = base - standoff;
   const w = L * s;
   const pcb = Math.max(1.5, 1.6 * s);
   return (
      <g>
         {standoff > 0 &&
            [x0 + 4, x0 + w - 7].map((sx) => <rect key={sx} x={sx} y={top} width={3} height={standoff} fill="rgb(200,170,80)" />)}
         {ph.shape === "board" || ph.shape === "module" ? (
            <g>
               <rect x={x0} y={top - pcb} width={w} height={pcb} {...body} />
               <rect x={x0 + w * 0.1} y={top - H * s} width={w * 0.8} height={H * s - pcb} fill="rgb(70,72,78)" opacity={0.85} />
            </g>
         ) : ph.shape === "servo" ? (
            <g>
               <rect x={x0} y={top - H * s * 0.85} width={w} height={H * s * 0.85} rx={2} {...body} />
               <rect x={x0 - 6} y={top - H * s * 0.62} width={w + 12} height={2.5} fill={ph.colour} />
               <rect x={x0 + w * 0.1} y={top - H * s} width={w * 0.3} height={H * s * 0.15} fill="rgb(235,235,235)" />
            </g>
         ) : ph.shape === "camera" ? (
            <g>
               <rect x={x0} y={top - H * s} width={w} height={H * s} rx={3} {...body} />
               {[0.3, 0.7].map((f) => (
                  <circle key={f} cx={x0 + w * f} cy={top - (H * s) / 2} r={Math.min(H * s * 0.25, 8)} fill="var(--camera)" opacity={0.8} />
               ))}
            </g>
         ) : ph.shape === "sonar" ? (
            <g>
               <rect x={x0} y={top - (H * s) / 3} width={w} height={(H * s) / 3} {...body} />
               {[0.25, 0.75].map((f) => (
                  <rect key={f} x={x0 + w * f - 7 * s} y={top - H * s} width={14 * s} height={(H * s * 2) / 3} fill="rgb(200,200,204)" stroke="var(--ink)" strokeWidth={0.5} />
               ))}
            </g>
         ) : (
            <rect x={x0} y={top - H * s} width={w} height={H * s} rx={ph.shape === "puck" ? 4 : 2} {...body} />
         )}
      </g>
   );
}

export function PartDrawing({ part, compact = false }: { part: Part; compact?: boolean }) {
   const arrowId = `dim${useId().replace(/:/g, "")}`;
   const ph = getPhysical(part.id);
   const [L, W, H] = ph.sizeMm;
   if (L === 0) return null;
   const s = Math.min(compact ? 3 : 6, (compact ? 70 : 150) / Math.max(L, W, H));
   const topW = L * s;
   const topH = W * s;
   const motor = ph.shape === "motor";
   const sideW = (motor ? W : L) * s;
   const sideH = (H + (motor ? 0 : (ph.standoffMm ?? 0))) * s;
   const bodyH = Math.max(topH, sideH);
   const width = PAD + topW + GAP + sideW + PAD + (motor ? 10 : 0) + (ph.shape === "servo" ? 12 : 0);
   const height = PAD + bodyH + (compact ? 8 : 36);
   const cx = PAD + topW / 2 + (motor ? 10 : 0) + (ph.shape === "servo" ? 6 : 0);
   const cy = PAD + bodyH / 2;
   const sideX = PAD + topW + GAP + (motor ? 10 : 0) + (ph.shape === "servo" ? 12 : 0);
   const base = PAD + bodyH;

   const summary = `${part.name}: ${r1(L)} × ${r1(W)} × ${r1(H)} mm${ph.holes.length ? `, ${ph.holes.length} × ${ph.screw} mounting holes` : ""}`;

   return (
      <ArrowId.Provider value={arrowId}>
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full max-w-full" role="img" aria-label={summary}>
         <defs>
            <marker id={arrowId} viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
               <path d="M0,0 L6,3 L0,6 z" fill="var(--muted)" />
            </marker>
         </defs>
         {!compact && (
            <>
               <text x={PAD} y={12} fontSize={8} className="font-mono" fill="var(--muted)" letterSpacing="0.08em">
                  TOP
               </text>
               <text x={sideX} y={12} fontSize={8} className="font-mono" fill="var(--muted)" letterSpacing="0.08em">
                  {motor ? "GEARBOX FACE" : "SIDE"}
               </text>
            </>
         )}
         <TopBody ph={ph} cx={cx} cy={cy} s={s} />
         {!motor && <Holes ph={ph} cx={cx} cy={cy} s={s} holes={ph.holes} />}
         <SideBody ph={ph} x0={sideX} base={base} s={s} />
         {!compact && (
            <>
               <Dim x1={cx - topW / 2} y1={cy + topH / 2 + 10} x2={cx + topW / 2} y2={cy + topH / 2 + 10} label={`${r1(L)}`} />
               <Dim x1={cx - topW / 2 - 10} y1={cy - topH / 2} x2={cx - topW / 2 - 10} y2={cy + topH / 2} label="" vertical />
               <text x={cx - topW / 2 - 13} y={cy} fontSize={9} textAnchor="end" dominantBaseline="middle" fill="var(--muted)" className="font-mono">
                  {r1(W)}
               </text>
               <Dim x1={sideX + sideW + 8} y1={base - H * s - (motor ? 0 : (ph.standoffMm ?? 0) * s)} x2={sideX + sideW + 8} y2={base - (motor ? 0 : (ph.standoffMm ?? 0) * s)} label={`${r1(H)}`} vertical />
               {!motor && ph.standoffMm ? (
                  <text x={sideX} y={base + 11} fontSize={8} fill="rgb(200,170,80)" className="font-mono">
                     {ph.standoffMm} mm standoffs
                  </text>
               ) : null}
               <text x={PAD} y={height - 6} fontSize={9} fill="var(--muted)" className="font-mono">
                  mm · {ph.holes.length > 0 ? `${ph.holes.length}× ${ph.screw} holes` : "no holes"} · {ph.method.replace("-", " ")}
               </text>
            </>
         )}
      </svg>
      </ArrowId.Provider>
   );
}
