import { describe, expect, it } from "vitest";
import { ARCHETYPES, templateFor } from "../../model/archetypes";
import { PARTS } from "../../model/catalog";
import { getPhysical } from "../../model/physical";
import { analyse } from "../../engine";
import { cablesFor } from "../cables";
import { portOffsets } from "../ports3d";

describe("connector positions", () => {
   it("every port of every part has a connector position", () => {
      const missing = PARTS.filter((p) => p.category !== "frame").flatMap((p) => {
         const offs = portOffsets(p, getPhysical(p.id));
         return p.ports.filter((port) => !offs.has(port.id)).map((port) => `${p.id}.${port.id}`);
      });
      expect(missing).toEqual([]);
   });
});

describe("cables", () => {
   it("every starter wire becomes at least one cable between rendered parts", () => {
      for (const a of ARCHETYPES) {
         const b = a.template;
         const cables = cablesFor(b, analyse(b));
         const wired = new Set(cables.map((c) => c.wireId));
         const frameWires = b.wires.filter((w) => [w.from.uid, w.to.uid].includes("frame"));
         expect([a.id, b.wires.filter((w) => !wired.has(w.id) && !frameWires.includes(w)).map((w) => w.id)]).toEqual([a.id, []]);
         expect(cables.every((c) => c.kind !== "invalid" && c.fault === null)).toBe(true);
      }
   });

   it("runs a separate lead to each of four motors", () => {
      const b = templateFor("mecanum-rover");
      const motorWire = b.wires.find((w) => w.to.uid === "mot" || w.from.uid === "mot")!;
      const cables = cablesFor(b, analyse(b)).filter((c) => c.wireId === motorWire.id);
      expect(new Set(cables.map((c) => (c.a.uid === "mot" ? c.a.key : c.b.key))).size).toBe(4);
   });

   it("daisy-chains bus servos", () => {
      const b = templateFor("hexapod");
      const cables = cablesFor(b, analyse(b)).filter((c) => c.kind === "bus-servo");
      // Two adapters, each driving a chain of 9 servos: 1 host link + 8 servo-to-servo links
      expect(cables).toHaveLength(18);
      expect(cables.filter((c) => c.a.uid === "adapter")).toHaveLength(2);
      expect(cables.filter((c) => c.a.uid === "legs" && c.b.uid === "legs")).toHaveLength(16);
   });

   it("marks a wire into the wrong port", () => {
      const b = templateFor("tank-rover");
      // 11.1 V from the switch straight into the Mega's 5 V USB input instead of via the buck
      const mega5v = b.wires.find((w) => w.to.uid === "mega" && w.to.port === "usb")!;
      mega5v.from = { uid: "sw", port: "out" };
      const cables = cablesFor(b, analyse(b)).filter((c) => c.wireId === mega5v.id);
      expect(cables[0].fault).not.toBeNull();
   });
});
