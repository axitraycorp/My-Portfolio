import { ImageResponse } from "next/og";
import { currentMilestone, milestones, profile } from "@/content/profile";

export const alt = `${profile.name} — ${profile.title}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// sRGB approximations of the dark-theme oklch tokens (Satori has no oklch)
const C = {
   bg: "#0f1319",
   surface: "#161b23",
   ink: "#f1f3f7",
   muted: "#a9b1bf",
   line: "#2c3340",
   camera: "#5fd6ea",
   radar: "#f1b445",
   fused: "#c39cf2",
};

async function loadFont(family: string, weight: number): Promise<ArrayBuffer | null> {
   try {
      const css = await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}`, {
         headers: { "User-Agent": "Mozilla/5.0 (compatible; og-image)" },
      }).then((r) => r.text());
      const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
      return url ? await fetch(url).then((r) => r.arrayBuffer()) : null;
   } catch {
      return null;
   }
}

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
   const top = pos.startsWith("t");
   const left = pos.endsWith("l");
   return (
      <div
         style={{
            position: "absolute",
            width: 34,
            height: 34,
            [top ? "top" : "bottom"]: 36,
            [left ? "left" : "right"]: 36,
            borderColor: C.camera,
            borderStyle: "solid",
            borderWidth: 0,
            [top ? "borderTopWidth" : "borderBottomWidth"]: 3,
            [left ? "borderLeftWidth" : "borderRightWidth"]: 3,
         }}
      />
   );
}

export default async function Image() {
   const [display, mono] = await Promise.all([
      loadFont("Space+Grotesk", 600),
      loadFont("JetBrains+Mono", 400),
   ]);
   const current = currentMilestone();
   const status = current
      ? `milestone ${current.number} of ${milestones.length} in progress`
      : "online";

   return new ImageResponse(
      (
         <div
            style={{
               width: "100%",
               height: "100%",
               display: "flex",
               position: "relative",
               background: C.bg,
               color: C.ink,
               fontFamily: display ? "Space Grotesk" : "sans-serif",
               padding: "84px 96px",
            }}
         >
            <Corner pos="tl" />
            <Corner pos="tr" />
            <Corner pos="bl" />
            <Corner pos="br" />

            {/* radar arcs */}
            {[520, 400, 280].map((d) => (
               <div
                  key={d}
                  style={{
                     position: "absolute",
                     right: 120 - d / 2 + 140,
                     bottom: -d / 2 + 40,
                     width: d,
                     height: d,
                     borderRadius: d,
                     border: `2px solid ${C.radar}`,
                     opacity: 0.35,
                  }}
               />
            ))}

            <div
               style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  width: 700,
               }}
            >
               <div
                  style={{
                     display: "flex",
                     fontFamily: mono ? "JetBrains Mono" : "monospace",
                     fontSize: 24,
                     color: C.muted,
                  }}
               >
                  <span style={{ color: C.camera }}>/robot/status</span>
                  <span>: {status}</span>
               </div>
               <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 96, fontWeight: 600, letterSpacing: -3, lineHeight: 1 }}>
                     {profile.name}
                  </div>
                  <div style={{ fontSize: 46, color: C.camera, marginTop: 18 }}>
                     {profile.title}
                  </div>
                  <div style={{ fontSize: 28, color: C.muted, marginTop: 28, lineHeight: 1.35 }}>
                     {profile.thesis}
                  </div>
               </div>
            </div>

            {/* detection box */}
            <div
               style={{
                  position: "absolute",
                  right: 110,
                  top: 150,
                  width: 250,
                  height: 250,
                  border: `3px solid ${C.fused}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: C.surface,
               }}
            >
               <div
                  style={{
                     position: "absolute",
                     left: -3,
                     top: -44,
                     background: C.fused,
                     color: C.bg,
                     fontFamily: mono ? "JetBrains Mono" : "monospace",
                     fontSize: 22,
                     padding: "6px 12px",
                     display: "flex",
                  }}
               >
                  robot 0.97 · 0.82 m
               </div>
               <div
                  style={{
                     display: "flex",
                     flexDirection: "column",
                     alignItems: "center",
                     gap: 10,
                  }}
               >
                  <div
                     style={{
                        width: 60,
                        height: 140,
                        background: C.line,
                        borderRadius: 8,
                        transform: "rotate(-24deg)",
                     }}
                  />
                  <div style={{ width: 120, height: 26, background: C.line, borderRadius: 13 }} />
               </div>
            </div>
         </div>
      ),
      {
         ...size,
         fonts: [
            ...(display
               ? [
                    {
                       name: "Space Grotesk",
                       data: display,
                       weight: 600 as const,
                       style: "normal" as const,
                    },
                 ]
               : []),
            ...(mono
               ? [
                    {
                       name: "JetBrains Mono",
                       data: mono,
                       weight: 400 as const,
                       style: "normal" as const,
                    },
                 ]
               : []),
         ],
      }
   );
}
