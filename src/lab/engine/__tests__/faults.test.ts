import { describe, expect, it } from "vitest";
import { templateFor } from "../../model/archetypes";
import type { ArchetypeId, Build, Issue } from "../../model/types";
import { analyse } from "..";

/* Each test takes a working starter build, introduces one classic mistake and
   checks the engine reports it with the right severity. */

let n = 0;
const wire = (a: string, b: string) => {
   const [fu, fp] = a.split(":");
   const [tu, tp] = b.split(":");
   n += 1;
   return { id: `t${n}`, from: { uid: fu, port: fp }, to: { uid: tu, port: tp } };
};

function mutate(id: ArchetypeId, fn: (b: Build) => void): Issue[] {
   const b = templateFor(id);
   fn(b);
   return analyse(b).report.issues;
}

const dropWire = (b: Build, a: string, c: string) => {
   const [fu, fp] = a.split(":");
   const [tu, tp] = c.split(":");
   b.wires = b.wires.filter(
      (w) => !(w.from.uid === fu && w.from.port === fp && w.to.uid === tu && w.to.port === tp),
   );
};

const find = (issues: Issue[], prefix: string) => issues.find((i) => i.id.startsWith(prefix));

describe("wiring faults", () => {
   it("flags servos powered from an Arduino 5 V pin", () => {
      const issues = mutate("robot-arm", (b) => {
         dropWire(b, "ubec:out", "small:v");
         b.wires.push(wire("uno:5v", "small:v"));
      });
      expect(find(issues, "actuator-on-logic")?.severity).toBe("error");
   });

   it("flags a 5 V ultrasonic echo into a 3.3 V ESP32 pin", () => {
      const issues = mutate("ackermann-car", (b) => {
         b.parts.push({ uid: "us", partId: "hc-sr04", count: 1 });
         b.wires.push(wire("buck:out", "us:vcc"), wire("us:io", "esp:gpio"));
      });
      expect(find(issues, "logic-5v-into-3v3")?.severity).toBe("error");
   });

   it("flags a 3S pack wired straight into a Raspberry Pi 5", () => {
      const issues = mutate("robot-dog", (b) => {
         dropWire(b, "buck:out", "pi:usbc");
         b.wires.push(wire("sw:out", "pi:usbc"));
      });
      expect(find(issues, "overvoltage:pi.usbc")?.severity).toBe("error");
   });

   it("flags a 2S pack wired straight into a Jetson", () => {
      const issues = mutate("mobile-manipulator", (b) => {
         dropWire(b, "boost:out", "jet:dc");
         b.wires.push(wire("sw:out", "jet:dc"));
      });
      expect(find(issues, "undervoltage:jet.dc")?.severity).toBe("error");
   });

   it("flags two VL53L0X sensors at the same I²C address", () => {
      const issues = mutate("robot-dog", (b) => {
         b.parts.push({ uid: "tof", partId: "vl53l0x", count: 2 });
         b.wires.push(wire("pi:gpio-5v", "tof:vcc"), wire("tof:i2c", "pi:i2c"));
      });
      expect(find(issues, "i2c-conflict")?.severity).toBe("error");
   });

   it("accepts the second sensor once its address is changed", () => {
      const issues = mutate("robot-dog", (b) => {
         b.parts.push(
            { uid: "tof1", partId: "vl53l0x", count: 1 },
            { uid: "tof2", partId: "vl53l0x", count: 1, i2cAddress: 0x30 },
         );
         b.wires.push(
            wire("pi:gpio-5v", "tof1:vcc"),
            wire("pi:gpio-5v", "tof2:vcc"),
            wire("tof1:i2c", "pi:i2c"),
            wire("tof2:i2c", "pi:i2c"),
         );
      });
      expect(find(issues, "i2c-conflict")).toBeUndefined();
   });

   it("flags a motor wired to a microcontroller pin", () => {
      const issues = mutate("tank-rover", (b) => {
         b.parts.push({ uid: "m2", partId: "tt-motor", count: 1 });
         b.wires.push(wire("m2:m", "mega:gpio"));
      });
      expect(find(issues, "motor-on-pin")?.severity).toBe("error");
   });

   it("flags battery power wired into a servo signal pin", () => {
      const issues = mutate("robot-arm", (b) => {
         b.wires.push(wire("psu:out", "big:sig"));
      });
      expect(find(issues, "power-into-signal")?.severity).toBe("error");
   });

   it("flags a bus servo on a PWM channel", () => {
      const issues = mutate("robot-dog", (b) => {
         b.parts.push({ uid: "bs", partId: "bus-servo-15kg", count: 1 });
         b.wires.push(wire("pca:pwm", "bs:bus"));
      });
      expect(find(issues, "protocol-mismatch")?.severity).toBe("error");
   });

   it("flags a computer with no power", () => {
      const issues = mutate("mecanum-rover", (b) => dropWire(b, "rcb:5v-out", "pi:usbc"));
      expect(find(issues, "unpowered:pi")?.severity).toBe("error");
   });

   it("flags too many USB devices", () => {
      const issues = mutate("mobile-manipulator", (b) => {
         b.parts.push({ uid: "cam2", partId: "usb-webcam", count: 1 });
         b.wires.push(wire("cam2:usb", "jet:usb"), wire("jet:usb-power", "cam2:usb5v"));
      });
      expect(find(issues, "capacity:jet.usb")?.severity).toBe("error");
   });

   it("flags two supplies tied to one input", () => {
      const issues = mutate("robot-dog", (b) => b.wires.push(wire("ubec:out", "pi:usbc")));
      expect(find(issues, "double-supply")?.severity).toBe("error");
   });

   it("flags a wire to a part that was removed", () => {
      const issues = mutate("robot-dog", (b) => {
         b.parts = b.parts.filter((p) => p.uid !== "imu");
      });
      expect(find(issues, "dangling")?.severity).toBe("error");
   });
});

describe("power budget faults", () => {
   it("flags a Raspberry Pi 5 on a 3 A power bank", () => {
      const issues = mutate("mecanum-rover", (b) => {
         b.parts.push({ uid: "bank", partId: "power-bank-5v3a", count: 1 });
         dropWire(b, "rcb:5v-out", "pi:usbc");
         b.wires.push(wire("bank:out", "pi:usbc"));
      });
      const overload = issues.find((i) => i.id.startsWith("overcurrent:bank") || i.id.startsWith("peak-overcurrent:bank"));
      expect(overload).toBeDefined();
   });

   it("flags an overheating linear regulator", () => {
      const issues = mutate("robot-arm", (b) => {
         dropWire(b, "buck:out", "uno:usb");
         b.wires.push(wire("psu:out", "uno:vin"));
         // A ~0.35 A load on the 5 V pin: (12 V − 5 V) × 0.36 A ≈ 2.5 W of heat
         b.parts.push({ uid: "lidar", partId: "lidar-2d", count: 1 });
         b.wires.push(wire("uno:5v", "lidar:5v"));
      });
      expect(find(issues, "linear-heat:uno.5v")?.severity).toBe("error");
   });

   it("warns about brownouts when a 2S pack feeds a 7 V-minimum regulator", () => {
      const issues = mutate("mecanum-rover", (b) => {
         b.parts.push({ uid: "buck", partId: "buck-5v-5a", count: 1 });
         dropWire(b, "rcb:5v-out", "pi:usbc");
         b.wires.push(wire("sw:out", "buck:in"), wire("buck:out", "pi:usbc"));
      });
      expect(find(issues, "brownout:buck.in")?.severity).toBe("warning");
   });

   it("warns when motors stall above the driver rating", () => {
      const issues = mutate("tank-rover", (b) => {
         b.parts = b.parts.map((p) => (p.uid === "drv" ? { ...p, partId: "l298n", count: 1 } : p));
         b.wires = b.wires.filter((w) => !(w.to.uid === "drv" && w.to.port === "vcc"));
         b.wires = b.wires.map((w) =>
            w.to.uid === "drv" && w.to.port === "vm" ? { ...w, to: { uid: "drv", port: "vs" } } : w,
         );
      });
      expect(find(issues, "driver-current")).toBeDefined();
   });
});

describe("compute, thermal and mechanical faults", () => {
   it("warns that a Jetson without a cooler will throttle", () => {
      const issues = mutate("mobile-manipulator", (b) => {
         b.parts = b.parts.filter((p) => p.uid !== "fan");
         b.wires = b.wires.filter((w) => w.to.uid !== "fan");
      });
      expect(find(issues, "thermal:jet")?.severity).toBe("warning");
   });

   it("flags a robot dog on SG90 micro servos", () => {
      const issues = mutate("robot-dog", (b) => {
         b.parts = b.parts.map((p) => (p.uid === "legs" ? { ...p, partId: "sg90" } : p));
      });
      expect(find(issues, "leg-torque")?.severity).toBe("error");
   });

   it("flags missing joints", () => {
      const issues = mutate("hexapod", (b) => {
         b.parts = b.parts.map((p) => (p.uid === "legs" ? { ...p, count: 12 } : p));
      });
      expect(find(issues, "servo-count")?.severity).toBe("error");
   });

   it("flags a build with no frame and no battery", () => {
      const issues = mutate("tank-rover", (b) => {
         b.parts = b.parts.filter((p) => p.uid !== "frame" && p.uid !== "bat");
         b.wires = b.wires.filter((w) => w.from.uid !== "bat");
      });
      expect(find(issues, "no-frame")?.severity).toBe("error");
      expect(find(issues, "no-power-source")?.severity).toBe("error");
   });
});
