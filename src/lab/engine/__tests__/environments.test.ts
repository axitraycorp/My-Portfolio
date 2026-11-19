import { describe, expect, it } from "vitest";
import { templateFor } from "../../model/archetypes";
import type { ArchetypeId, TestVerdict } from "../../model/types";
import { analyse } from "..";
import { getEnvironment, runEnvironment } from "../environments";

const verdict = (archetype: ArchetypeId, envId: string): TestVerdict =>
   runEnvironment(analyse(templateFor(archetype)), getEnvironment(envId)!).verdict;

const criterion = (archetype: ArchetypeId, envId: string, label: RegExp) =>
   runEnvironment(analyse(templateFor(archetype)), getEnvironment(envId)!).criteria.find((c) => label.test(c.label));

describe("environment tests", () => {
   it("every starter build passes the bench test", () => {
      for (const id of [
         "mecanum-rover",
         "tank-rover",
         "ackermann-car",
         "robot-arm",
         "mobile-manipulator",
         "robot-dog",
         "hexapod",
         "humanoid",
      ] as ArchetypeId[]) {
         expect([id, verdict(id, "bench")]).toEqual([id, "pass"]);
      }
   });

   it("only legged robots climb stairs", () => {
      expect(criterion("tank-rover", "stairs", /Stair/)?.verdict).toBe("fail");
      expect(criterion("mecanum-rover", "stairs", /Stair/)?.verdict).toBe("fail");
      expect(criterion("robot-dog", "stairs", /Stair/)?.verdict).not.toBe("fail");
   });

   it("a fixed arm can't take mobility tests but passes pick and place", () => {
      expect(criterion("robot-arm", "ramp", /Mobility/)?.verdict).toBe("fail");
      expect(criterion("robot-arm", "pick-place", /Lift/)?.verdict).not.toBe("fail");
   });

   it("a bench-powered arm fails tests that need a battery", () => {
      expect(criterion("robot-arm", "endurance", /Power source/)?.verdict).toBe("fail");
   });

   it("SLAM needs ranging and a Linux computer", () => {
      expect(criterion("mecanum-rover", "warehouse", /SLAM/)?.verdict).toBe("pass");
      expect(criterion("tank-rover", "warehouse", /SLAM/)?.verdict).toBe("fail");
   });

   it("the Jetson manipulator runs voice + LLM on board; the Pi humanoid needs the cloud", () => {
      expect(criterion("mobile-manipulator", "voice", /Voice/)?.verdict).toBe("pass");
      expect(criterion("humanoid", "voice", /Voice/)?.verdict).toBe("warn");
   });

   it("mecanum wheels are flagged on rough ground", () => {
      expect(criterion("mecanum-rover", "yard", /Driving/)?.verdict).not.toBe("pass");
   });

   it("detection speed follows AI compute", () => {
      expect(criterion("mobile-manipulator", "pick-place", /detection/)?.verdict).toBe("pass");
   });
});
