import type { DataPort, DataProtocol, LogicVoltage, MotorPort, PowerInPort, PowerOutPort } from "./types";

/* Small constructors so catalog entries stay readable. */

export const powerIn = (
   id: string,
   label: string,
   vMin: number,
   vMax: number,
   typicalCurrent: number,
   peakCurrent: number,
   required = true,
): PowerInPort => ({ kind: "power-in", id, label, vMin, vMax, typicalCurrent, peakCurrent, required });

export const powerOut = (
   id: string,
   label: string,
   voltage: number,
   maxCurrent: number,
   opts: {
      range?: [number, number];
      from?: string;
      conversion?: "passthrough" | "linear" | "switching";
      efficiency?: number;
      actuatorRail?: boolean;
   } = {},
): PowerOutPort => ({
   kind: "power-out",
   id,
   label,
   voltage,
   vMin: opts.range?.[0] ?? voltage,
   vMax: opts.range?.[1] ?? voltage,
   maxCurrent,
   from: opts.from,
   conversion: opts.conversion,
   efficiency: opts.efficiency,
   actuatorRail: opts.actuatorRail,
});

/** Input whose draw is given in watts (current derived from the actual supply voltage). */
export const powerInW = (
   id: string,
   label: string,
   vMin: number,
   vMax: number,
   typicalW: number,
   peakW: number,
): PowerInPort => ({
   kind: "power-in",
   id,
   label,
   vMin,
   vMax,
   typicalCurrent: 0,
   peakCurrent: 0,
   required: true,
   watts: { typical: typicalW, peak: peakW },
});

export const host = (
   id: string,
   label: string,
   protocol: DataProtocol,
   logic: LogicVoltage,
   capacity: number,
   tolerant5v = false,
): DataPort => ({ kind: "data", id, label, protocol, role: "host", logic, capacity, tolerant5v });

export const device = (
   id: string,
   label: string,
   protocol: DataProtocol,
   logic: LogicVoltage,
   extra: {
      i2cAddress?: number;
      uses?: number;
      tolerant5v?: boolean;
      accepts3v3?: boolean;
      drivesHost?: boolean;
   } = {},
): DataPort => ({ kind: "data", id, label, protocol, role: "device", logic, ...extra });

export const motorOut = (
   id: string,
   label: string,
   voltage: number,
   current: number,
   channels: number,
   supply: string,
): MotorPort => ({ kind: "motor", id, label, direction: "out", voltage, current, channels, supply });

export const motorIn = (id: string, label: string, voltage: number, stallCurrent: number): MotorPort => ({
   kind: "motor",
   id,
   label,
   direction: "in",
   voltage,
   current: stallCurrent,
});
