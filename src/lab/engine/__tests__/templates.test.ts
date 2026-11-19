import { describe, expect, it } from "vitest";
import { ARCHETYPES } from "../../model/archetypes";
import { analyse } from "..";

describe("archetype starter builds", () => {
   for (const a of ARCHETYPES) {
      it(`${a.name} starts with no errors or warnings`, () => {
         const { report } = analyse(a.template);
         const problems = report.issues.filter((i) => i.severity !== "info");
         expect(problems.map((i) => `${i.severity} ${i.id}: ${i.title}`)).toEqual([]);
      });
   }

   it("every template reports mass, price and power", () => {
      for (const a of ARCHETYPES) {
         const { stats } = analyse(a.template).report;
         expect(stats.massG).toBeGreaterThan(0);
         expect(stats.priceUsd).toBeGreaterThan(0);
         expect(stats.avgPowerW).toBeGreaterThan(0);
      }
   });
});
