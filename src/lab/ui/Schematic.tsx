import { getPart } from "../model/catalog";
import type { Build, PartCategory } from "../model/types";
import { wireKind, type WireKind } from "./ports";

/* Block diagram: power flows left to right, from the battery to the actuators. */

const TIER: Record<PartCategory, number> = {
   battery: 0,
   protection: 0,
   regulator: 1,
   controller: 2,
   compute: 2,
   accelerator: 2,
   cooling: 2,
   "motor-driver": 3,
   "servo-driver": 3,
   sensor: 3,
   motor: 4,
   servo: 4,
   frame: 4,
};
const TIER_LABELS = ["Power", "Regulation", "Brains", "Drivers & sensors", "Actuators"];

const COL_W = 190;
const BOX_W = 150;
const BOX_H = 40;
const ROW_H = 54;
const TOP = 34;

const DASH: Record<WireKind, string | undefined> = {
   power: undefined,
   motor: "8 4",
   data: "2 4",
   invalid: "1 3",
};

type Props = { build: Build; faultyWires: Set<string>; highlight: Set<string> };

export function Schematic({ build, faultyWires, highlight }: Props) {
   const columns: string[][] = [[], [], [], [], []];
   for (const inst of build.parts) {
      const cat = getPart(inst.partId)?.category;
      if (cat) columns[TIER[cat]].push(inst.uid);
   }
   const pos = new Map<string, { x: number; y: number }>();
   columns.forEach((col, i) => col.forEach((uid, j) => pos.set(uid, { x: 10 + i * COL_W, y: TOP + j * ROW_H })));
   const height = TOP + Math.max(1, ...columns.map((c) => c.length)) * ROW_H;
   const width = 10 + 4 * COL_W + BOX_W + 10;

   return (
      <figure className="flex flex-col gap-2xs">
         <div className="overflow-x-auto rounded-hud border border-line bg-background">
            <svg
               viewBox={`0 0 ${width} ${height}`}
               className="block min-w-[640px]"
               role="img"
               aria-label={`Wiring diagram: ${build.parts.length} parts, ${build.wires.length} wires, ${faultyWires.size} flagged`}
            >
               {TIER_LABELS.map((label, i) => (
                  <text key={label} x={10 + i * COL_W} y={18} className="fill-[var(--muted)] font-mono" fontSize="10" letterSpacing="0.08em">
                     {label.toUpperCase()}
                  </text>
               ))}
               {build.wires.map((w) => {
                  const a = pos.get(w.from.uid);
                  const b = pos.get(w.to.uid);
                  if (!a || !b) return null;
                  const [l, r] = a.x <= b.x ? [a, b] : [b, a];
                  const x1 = l.x + BOX_W;
                  const y1 = l.y + BOX_H / 2;
                  const x2 = l.x === r.x ? r.x + BOX_W : r.x;
                  const y2 = r.y + BOX_H / 2;
                  const bend = l.x === r.x ? 40 : (x2 - x1) / 2;
                  const d = `M${x1},${y1} C${x1 + bend},${y1} ${x2 - (l.x === r.x ? -40 : bend)},${y2} ${x2},${y2}`;
                  const kind = wireKind(build, w);
                  const bad = faultyWires.has(w.id) || kind === "invalid";
                  return (
                     <path
                        key={w.id}
                        d={d}
                        fill="none"
                        stroke={bad ? "var(--warning)" : kind === "power" ? "var(--line-strong)" : "var(--muted)"}
                        strokeWidth={bad ? 2 : 1.25}
                        strokeDasharray={DASH[kind]}
                        opacity={bad ? 1 : 0.8}
                     >
                        <title>{`${w.from.uid}.${w.from.port} → ${w.to.uid}.${w.to.port}${bad ? " (flagged)" : ""}`}</title>
                     </path>
                  );
               })}
               {[...pos.entries()].map(([uid, p]) => {
                  const inst = build.parts.find((i) => i.uid === uid)!;
                  const part = getPart(inst.partId)!;
                  const name = part.name.length > 22 ? `${part.name.slice(0, 21)}…` : part.name;
                  const lit = highlight.has(uid);
                  return (
                     <g key={uid}>
                        <rect
                           x={p.x}
                           y={p.y}
                           width={BOX_W}
                           height={BOX_H}
                           rx={4}
                           fill="var(--surface)"
                           stroke={lit ? "var(--camera)" : "var(--line-strong)"}
                           strokeWidth={lit ? 2 : 1}
                        />
                        <text x={p.x + 8} y={p.y + 16} fontSize="11" className="fill-[var(--ink)]">
                           {name}
                        </text>
                        <text x={p.x + 8} y={p.y + 31} fontSize="9" className="fill-[var(--muted)] font-mono">
                           [{uid}]{inst.count > 1 ? ` ×${inst.count}` : ""}
                        </text>
                     </g>
                  );
               })}
            </svg>
         </div>
         <figcaption className="flex flex-wrap gap-x-m gap-y-3xs font-mono text-caption text-muted">
            <span>── power</span>
            <span>– – motor</span>
            <span>··· data</span>
            <span className="text-warning">thick = flagged wire</span>
         </figcaption>
      </figure>
   );
}
