import { describe, expect, it } from "vitest";
import { ARCHETYPES, templateFor } from "../../model/archetypes";
import { PARTS } from "../../model/catalog";
import { hasPhysical } from "../../model/physical";
import { runChecks } from "../../engine";
import { computeLayout } from "../layout";
import { buildPlan } from "../plan";
import type { Build } from "../../model/types";

const ids = (b: Build) => runChecks(b).issues.map((i) => i.id);

describe("physical data", () => {
   it("every non-frame part has dimensions and mounting", () => {
      const missing = PARTS.filter((p) => p.category !== "frame" && !hasPhysical(p.id)).map((p) => p.id);
      expect(missing).toEqual([]);
   });
});

describe("layout", () => {
   it("places every part of every starter build, with all joints and motors filled", () => {
      for (const a of ARCHETYPES) {
         const l = computeLayout(a.template);
         expect([a.id, l.overflow.length]).toEqual([a.id, 0]);
         expect([a.id, l.servos.every(Boolean), l.motors.every(Boolean)]).toEqual([a.id, true, true]);
      }
   });

   it("adds an upper deck on standoffs for the LiDAR", () => {
      const l = computeLayout(templateFor("mecanum-rover"));
      expect(l.decks).toHaveLength(2);
      const lidar = l.placements.find((p) => p.part.id === "lidar-2d")!;
      expect(lidar.level).toBe(1);
      expect(l.decks[1].standoffMm).toBeGreaterThanOrEqual(25);
   });

   it("stacks the cooler on the computer", () => {
      const l = computeLayout(templateFor("robot-dog"));
      const pi = l.placements.find((p) => p.part.id === "rpi5-8gb")!;
      const cooler = l.placements.find((p) => p.part.id === "active-cooler-sbc")!;
      expect(cooler.zone).toBe("stack");
      expect(cooler.pos[0]).toBeCloseTo(pi.pos[0]);
      expect(cooler.pos[1]).toBeGreaterThan(pi.pos[1]);
   });

   it("leaves empty joints when servos are missing", () => {
      const b = templateFor("hexapod");
      b.parts.find((p) => p.uid === "legs")!.count = 15;
      expect(computeLayout(b).servos.filter((s) => s === null)).toHaveLength(3);
   });
});

describe("fit checks", () => {
   it("micro servos in standard brackets need adapters", () => {
      const b = templateFor("robot-dog");
      b.parts.find((p) => p.uid === "legs")!.partId = "mg90s";
      expect(ids(b)).toContain("servo-fit:legs");
      expect(runChecks(b).issues.find((i) => i.id === "servo-fit:legs")?.severity).toBe("warning");
   });

   it("oversized servos don't fit", () => {
      const b = templateFor("hexapod");
      b.parts.find((p) => p.uid === "legs")!.partId = "bus-servo-35kg";
      expect(runChecks(b).issues.find((i) => i.id === "servo-fit:legs")?.severity).toBe("error");
   });

   it("a 37 mm motor doesn't fit 25 mm brackets", () => {
      const b = templateFor("tank-rover");
      b.parts.find((p) => p.uid === "mot")!.partId = "geared-520-12v";
      expect(ids(b)).toContain("motor-fit:mot");
   });

   it("a big pack doesn't fit the bay", () => {
      const b = templateFor("hexapod");
      b.parts.find((p) => p.uid === "bat")!.partId = "lipo-3s-5000";
      expect(ids(b)).toContain("battery-fit:bat");
   });

   it("too much on the decks is reported", () => {
      const b = templateFor("ackermann-car");
      b.parts.push({ uid: "extra", partId: "jetson-orin-nx-16gb", count: 6 });
      expect(ids(b)).toContain("deck-space");
   });
});

describe("assembly plan", () => {
   it("covers frame to bring-up, and every starter passes all power tests", () => {
      for (const a of ARCHETYPES) {
         const plan = buildPlan(a.template);
         expect(plan.steps[0].id).toBe("frame");
         const tests = plan.steps.filter((s) => s.test);
         expect(tests).toHaveLength(5);
         expect([a.id, tests.map((t) => t.test!.verdict)]).toEqual([a.id, ["pass", "pass", "pass", "pass", "pass"]]);
         expect(plan.hardware.length).toBeGreaterThan(5);
      }
   });

   it("lists screws from the hole pattern", () => {
      const plan = buildPlan(templateFor("mecanum-rover"));
      const brains = plan.steps.find((s) => s.id === "brains")!;
      expect(brains.hardware).toContainEqual({ item: "M2.5×10 standoff", qty: 4 });
      expect(brains.parts.find((p) => p.partId === "rpi5-8gb")?.where).toMatch(/deck 1/);
   });

   it("stops bring-up at the stage where a fault appears", () => {
      const b = templateFor("tank-rover");
      // A 19 V boost where the 5 V buck belongs: the fault appears once the Mega is connected
      b.parts.find((p) => p.uid === "buck")!.partId = "boost-19v-4a";
      const tests = buildPlan(b).steps.filter((s) => s.test);
      const first = tests.findIndex((t) => t.test!.verdict === "fail");
      expect(first).toBeGreaterThanOrEqual(1);
      expect(first).toBeLessThanOrEqual(2);
   });

   it("sizes wires by current", () => {
      const wiring = buildPlan(templateFor("humanoid")).steps.find((s) => s.kind === "wiring")!;
      expect(wiring.wires!.some((w) => w.kind === "power" && /AWG/.test(w.cable))).toBe(true);
      expect(wiring.wires!.some((w) => w.kind === "data")).toBe(true);
   });
});
