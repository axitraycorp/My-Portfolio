import type { Architecture, ArchitectureNode, Channel } from "@/content/profile";

type Point = { x: number; y: number };
type Layout = {
   width: number;
   height: number;
   nodeW: number;
   nodeH: number;
   pos: (n: ArchitectureNode) => Point;
   edgePath: (a: Point, b: Point) => string;
};

const CHANNEL_VAR: Record<Channel, string> = {
   camera: "var(--camera)",
   radar: "var(--radar)",
   fused: "var(--fused)",
   neutral: "var(--line-strong)",
};

function layouts(arch: Architecture): { wide: Layout; narrow: Layout } {
   const layers = Math.max(...arch.nodes.map((n) => n.layer)) + 1;
   const maxLane = Math.max(...arch.nodes.map((n) => n.lane));

   const wideW = 1000;
   const wideH = maxLane > 0 ? 300 : 160;
   const nodeW = 160;
   const nodeH = 58;
   const wide: Layout = {
      width: wideW,
      height: wideH,
      nodeW,
      nodeH,
      pos: (n) => ({
         x: nodeW / 2 + 10 + (n.layer * (wideW - nodeW - 20)) / Math.max(1, layers - 1),
         y: maxLane > 0 ? 60 + (n.lane * (wideH - 120)) / maxLane : wideH / 2,
      }),
      edgePath: (a, b) => {
         const x1 = a.x + nodeW / 2;
         const x2 = b.x - nodeW / 2;
         const mx = (x1 + x2) / 2;
         return `M${x1} ${a.y} C${mx} ${a.y} ${mx} ${b.y} ${x2} ${b.y}`;
      },
   };

   const narrowW = 352;
   const rowH = 112;
   const nNodeW = 164;
   const nNodeH = 54;
   const narrow: Layout = {
      width: narrowW,
      height: layers * rowH,
      nodeW: nNodeW,
      nodeH: nNodeH,
      pos: (n) => ({
         x:
            maxLane > 0
               ? nNodeW / 2 + 6 + (n.lane * (narrowW - nNodeW - 12)) / maxLane
               : narrowW / 2,
         y: rowH / 2 + n.layer * rowH,
      }),
      edgePath: (a, b) => {
         const y1 = a.y + nNodeH / 2;
         const y2 = b.y - nNodeH / 2;
         const my = (y1 + y2) / 2;
         return `M${a.x} ${y1} C${a.x} ${my} ${b.x} ${my} ${b.x} ${y2}`;
      },
   };

   return { wide, narrow };
}

function Diagram({
   arch,
   layout,
   variant,
   titleId,
}: {
   arch: Architecture;
   layout: Layout;
   variant: "wide" | "narrow";
   titleId: string;
}) {
   const byId = new Map(arch.nodes.map((n) => [n.id, n]));
   const { nodeW, nodeH } = layout;

   return (
      <svg
         viewBox={`0 0 ${layout.width} ${layout.height}`}
         className={`arch__svg arch__svg--${variant}`}
         role="img"
         aria-labelledby={titleId}
         fill="none"
      >
         <g>
            {arch.edges.map((edge, i) => {
               const from = byId.get(edge.from);
               const to = byId.get(edge.to);
               if (!from || !to) return null;
               const d = layout.edgePath(layout.pos(from), layout.pos(to));
               const color = CHANNEL_VAR[edge.channel];
               return (
                  <g key={`${edge.from}-${edge.to}`}>
                     <path
                        d={d}
                        style={{ stroke: color }}
                        strokeWidth="1.5"
                        className="arch__edge"
                     />
                     {[0, 1].map((k) => (
                        <circle
                           key={k}
                           r="4"
                           className="arch__packet"
                           style={
                              {
                                 fill: color,
                                 offsetPath: `path("${d}")`,
                                 animationDelay: `${i * 0.35 + k * 1.1}s`,
                              } as React.CSSProperties
                           }
                        />
                     ))}
                  </g>
               );
            })}
         </g>
         {arch.nodes.map((node) => {
            const p = layout.pos(node);
            const color = CHANNEL_VAR[node.channel];
            return (
               <g key={node.id} transform={`translate(${p.x - nodeW / 2} ${p.y - nodeH / 2})`}>
                  <rect
                     width={nodeW}
                     height={nodeH}
                     rx="6"
                     className="arch__node"
                     style={{ stroke: color }}
                  />
                  <rect width="4" height={nodeH} rx="2" style={{ fill: color }} />
                  <text x="14" y={node.topic ? 23 : nodeH / 2 + 5} className="arch__label">
                     {node.label}
                  </text>
                  {node.topic && (
                     <text x="14" y="42" className="arch__topic">
                        {node.topic}
                     </text>
                  )}
               </g>
            );
         })}
      </svg>
   );
}

/** Text description of the pipeline for screen readers, derived from the edges. */
function describe(arch: Architecture): string {
   const byId = new Map(arch.nodes.map((n) => [n.id, n.label]));
   return arch.edges
      .map((e) => `${byId.get(e.from)} → ${byId.get(e.to)}${e.label ? ` (${e.label})` : ""}`)
      .join("; ");
}

export function ArchitectureDiagram({
   architecture,
   id,
   title,
}: {
   architecture: Architecture;
   id?: string;
   title: string;
}) {
   const { wide, narrow } = layouts(architecture);
   const titleId = `${id ?? "arch"}-title`;
   return (
      <figure id={id} className="arch">
         <p id={titleId} className="sr-only">
            {title}: {describe(architecture)}
         </p>
         <Diagram arch={architecture} layout={wide} variant="wide" titleId={titleId} />
         <Diagram arch={architecture} layout={narrow} variant="narrow" titleId={titleId} />
         <figcaption className="arch__legend">
            <span data-channel="camera">camera</span>
            <span data-channel="radar">radar</span>
            <span data-channel="fused">fused</span>
         </figcaption>
      </figure>
   );
}
