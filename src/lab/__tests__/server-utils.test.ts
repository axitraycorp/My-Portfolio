// @vitest-environment node
import { describe, expect, it } from "vitest";
import { generatePassword, hashPassword, verifyPassword } from "../server/password";
import { parseBuild } from "../model/validation";
import { templateFor } from "../model/archetypes";
import { isCompatible, listPorts, nextId, wireKind } from "../ui/ports";
import { buildBrief } from "../engine/brief";

describe("passwords", () => {
   it("hashes with a salt and verifies", async () => {
      const a = await hashPassword("correct horse battery");
      const b = await hashPassword("correct horse battery");
      expect(a).not.toBe(b);
      expect(await verifyPassword("correct horse battery", a)).toBe(true);
      expect(await verifyPassword("wrong horse battery", a)).toBe(false);
   });

   it("rejects malformed hashes", async () => {
      expect(await verifyPassword("x", "plaintext")).toBe(false);
   });

   it("generates readable one-time passwords", () => {
      const p = generatePassword();
      expect(p).toHaveLength(16);
      expect(p).toMatch(/^[A-HJ-NP-Za-km-z2-9]+$/);
   });
});

describe("build validation", () => {
   it("accepts every starter build", () => {
      for (const id of ["mecanum-rover", "hexapod", "humanoid", "robot-arm"] as const) {
         expect(parseBuild(templateFor(id)).ok).toBe(true);
      }
   });

   it("rejects unknown parts, archetypes and duplicate ids", () => {
      const b = templateFor("mecanum-rover");
      expect(parseBuild({ ...b, archetype: "teleporter" }).ok).toBe(false);
      expect(parseBuild({ ...b, parts: [...b.parts, { uid: "x", partId: "flux-capacitor", count: 1 }] }).ok).toBe(false);
      expect(parseBuild({ ...b, parts: [...b.parts, b.parts[0]] }).ok).toBe(false);
      expect(parseBuild({ ...b, name: "" }).ok).toBe(false);
   });

   it("caps the size of a build", () => {
      const b = templateFor("mecanum-rover");
      const wires = Array.from({ length: 301 }, (_, i) => ({ id: `z${i}`, from: b.wires[0].from, to: b.wires[0].to }));
      expect(parseBuild({ ...b, wires }).ok).toBe(false);
   });
});

describe("port helpers", () => {
   it("classifies the starter wiring as valid", () => {
      const b = templateFor("mobile-manipulator");
      expect(b.wires.every((w) => wireKind(b, w) !== "invalid")).toBe(true);
   });

   it("only matches complementary ports", () => {
      const ports = listPorts(templateFor("mecanum-rover"));
      const out = ports.find((p) => p.port.kind === "power-out")!.port;
      const inp = ports.find((p) => p.port.kind === "power-in")!.port;
      expect(isCompatible(out, inp)).toBe(true);
      expect(isCompatible(out, out)).toBe(false);
   });

   it("finds the next free id", () => {
      expect(nextId("w", ["w1", "w2", "w4"])).toBe("w3");
   });
});

describe("advisor brief", () => {
   it("describes parts, issues and environment results", () => {
      const brief = buildBrief(templateFor("robot-dog"));
      expect(brief).toContain("PARTS:");
      expect(brief).toContain("SIMULATOR ISSUES");
      expect(brief).toContain("ENVIRONMENT TESTS:");
   });
});
