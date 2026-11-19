import { describe, expect, it } from "vitest";
import { analyse } from "../../engine";
import { ARCHETYPES } from "../../model/archetypes";
import type { ArchetypeId } from "../../model/types";
import { guideState, scratchBuild, type GuideStageId } from "../steps";

/** Plays the guide: always takes its first recommended part or wire. */
function follow(archetype: ArchetypeId) {
   let build = scratchBuild(archetype);
   const skipped = new Set<GuideStageId>();
   const visited: GuideStageId[] = [];
   let n = 1;
   for (let i = 0; i < 80; i++) {
      const g = guideState(build, analyse(build), { skipped, planSeen: false });
      const s = g.current;
      if (visited[visited.length - 1] !== s.stage) visited.push(s.stage);
      if (s.stage === "assemble" || s.stage === "checks") return { build, visited, stage: s.stage };
      const pick = s.parts.find((p) => p.recommended);
      if (pick) {
         build = { ...build, parts: [...build.parts, { uid: `g${n++}`, partId: pick.partId, count: pick.count }] };
      } else if (s.wires.length > 0) {
         const ws = s.wires.map((w, j) => ({ id: `gw${n + j}`, from: w.from, to: w.to }));
         n += ws.length;
         build = { ...build, wires: [...build.wires, ...ws] };
      } else if (s.optional) {
         skipped.add(s.stage);
      } else {
         return { build, visited, stage: s.stage };
      }
   }
   return { build, visited, stage: "stuck" as const };
}

describe("lab guide", () => {
   it("starts from a bare frame by asking for a brain", () => {
      const b = scratchBuild("robot-dog");
      expect(guideState(b, analyse(b), { skipped: new Set(), planSeen: false }).current.stage).toBe("brain");
   });

   it("leads every robot type from scratch to a build with no errors", () => {
      for (const a of ARCHETYPES) {
         const r = follow(a.id);
         const report = analyse(r.build).report;
         expect([a.id, r.stage, report.issues.filter((i) => i.severity === "error").map((i) => i.title)]).toEqual([a.id, "assemble", []]);
      }
   });

   it("walks through the stages in order", () => {
      const r = follow("mecanum-rover");
      expect(r.visited[0]).toBe("brain");
      expect(r.visited.indexOf("power")).toBeLessThan(r.visited.indexOf("wiring"));
      expect(r.visited.indexOf("actuators")).toBeLessThan(r.visited.indexOf("wiring"));
   });

   it("explains the first error and points at the parts", () => {
      const r = follow("tank-rover");
      const b = { ...r.build, wires: r.build.wires.slice(1) };
      const g = guideState(b, analyse(b), { skipped: new Set(), planSeen: false });
      expect(["wiring", "checks"]).toContain(g.current.stage);
      expect(g.current.highlight.length).toBeGreaterThan(0);
   });
});

describe("AI guide tools", () => {
   it("accepts real parts and ports, rejects made-up ones", async () => {
      const { parseGuideTool } = await import("../ai");
      const b = scratchBuild("mecanum-rover");
      b.parts.push({ uid: "bat", partId: "lipo-2s-2200", count: 1 }, { uid: "sw", partId: "switch-fuse-15a", count: 1 });
      expect(parseGuideTool("add_part", { part_id: "rpi5-8gb", count: 1 }, b)?.name).toBe("add_part");
      expect(parseGuideTool("add_part", { part_id: "flux-capacitor" }, b)).toBeNull();
      expect(parseGuideTool("connect", { from: "bat:out", to: "sw:in" }, b)?.name).toBe("connect");
      expect(parseGuideTool("connect", { from: "bat:out", to: "sw:nope" }, b)).toBeNull();
      expect(parseGuideTool("open_tab", { tab: "plan" }, b)?.name).toBe("open_tab");
      expect(parseGuideTool("rm_rf", {}, b)).toBeNull();
   });
});
