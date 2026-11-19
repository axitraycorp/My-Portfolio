/**
 * Robot Lab domain model. Every part exposes typed ports; a build is a set of
 * part instances plus wires between ports. The engine (src/lab/engine) checks
 * builds against these specs. Values are typical datasheet figures used for
 * simulation — not a substitute for the real datasheet.
 */

export type ArchetypeId =
   | "mecanum-rover"
   | "tank-rover"
   | "ackermann-car"
   | "robot-arm"
   | "mobile-manipulator"
   | "robot-dog"
   | "hexapod"
   | "humanoid";

export type PartCategory =
   | "frame"
   | "controller"
   | "compute"
   | "accelerator"
   | "motor-driver"
   | "servo-driver"
   | "motor"
   | "servo"
   | "sensor"
   | "battery"
   | "regulator"
   | "cooling"
   | "protection";

export type LogicVoltage = 3.3 | 5;

/** Supplies power. `voltage` is the nominal output; `vMin`/`vMax` its range (e.g. a battery's charge range). */
export interface PowerOutPort {
   kind: "power-out";
   id: string;
   label: string;
   voltage: number;
   vMin: number;
   vMax: number;
   /** Maximum continuous current this output can deliver (A). */
   maxCurrent: number;
   /**
    * The input that feeds this output (absent for batteries and other roots).
    * Loads on the output are added to that input's current.
    */
   from?: string;
   /**
    * passthrough: same voltage as the input (e.g. a servo rail);
    * linear: input current = output current, excess voltage becomes heat;
    * switching: input power = output power / efficiency.
    */
   conversion?: "passthrough" | "linear" | "switching";
   /** Switching efficiency, 0–1. */
   efficiency?: number;
   /** A rail designed to feed servos/motors (not a logic supply). */
   actuatorRail?: boolean;
}

/** Consumes power. */
export interface PowerInPort {
   kind: "power-in";
   id: string;
   label: string;
   vMin: number;
   vMax: number;
   /** Typical current at nominal voltage (A). */
   typicalCurrent: number;
   /** Peak / stall current (A). */
   peakCurrent: number;
   /**
    * True if this input must be powered. If none of a part's inputs are
    * required, at least one of them must be (e.g. Arduino: USB or VIN).
    */
   required: boolean;
   /** For wide-range inputs (SBCs): power draw; current is derived from the actual voltage. */
   watts?: { typical: number; peak: number };
}

export type DataProtocol =
   | "i2c"
   | "uart"
   | "spi"
   | "usb"
   | "csi"
   | "pwm"
   | "gpio"
   | "bus-servo"
   | "pcie";

/** A data connection point. Hosts accept up to `capacity` devices (pins, channels or sockets). */
export interface DataPort {
   kind: "data";
   id: string;
   label: string;
   protocol: DataProtocol;
   role: "host" | "device";
   /** Signal voltage. */
   logic: LogicVoltage;
   /** Whether a 3.3 V input safely accepts 5 V signals. */
   tolerant5v?: boolean;
   /** Hosts: how many devices / channels / sockets. */
   capacity?: number;
   /** Devices: I²C address (7-bit). */
   i2cAddress?: number;
   /** Devices: number of channels/units this port occupies on the host (e.g. 12 servos = 12). */
   uses?: number;
   /** Devices with 5 V logic: a 3.3 V high is still read reliably. */
   accepts3v3?: boolean;
   /** Devices: false if the device only listens (never drives the line back to the host). */
   drivesHost?: boolean;
}

/** Motor terminals: drivers have `out`, motors have `in`. */
export interface MotorPort {
   kind: "motor";
   id: string;
   label: string;
   direction: "out" | "in";
   /** Driver: max motor voltage; motor: rated voltage. */
   voltage: number;
   /** Driver: continuous current per channel; motor: stall current. */
   current: number;
   /** Driver: number of motor channels. */
   channels?: number;
   /** Driver: the power input that feeds the motors. */
   supply?: string;
}

export type Port = PowerOutPort | PowerInPort | DataPort | MotorPort;

export interface ComputeSpec {
   cpu: string;
   chipset: string;
   gpu?: string;
   ram: string;
   ramGB: number;
   /** AI performance in TOPS (INT8) available to vision/AI workloads. */
   tops: number;
   /** Rough single-board CPU capability, 1 = Raspberry Pi 4. */
   cpuScore: number;
   runsLinux: boolean;
   wifi: boolean;
   /** Power the compute draws at full load (W), used for thermal checks. */
   loadWatts: number;
   /** Max die temperature before throttling (°C). */
   throttleC: number;
}

export interface CoolingSpec {
   /** Heat it can remove at 25 °C ambient while keeping the chip under its limit (W). */
   capacityWatts: number;
   noiseDb?: number;
}

export interface BatterySpec {
   chemistry: "LiPo" | "Li-ion" | "LiFePO4" | "NiMH" | "Power bank" | "Mains";
   cells: string;
   /** Pack nominal voltage used for energy (Wh) — for power banks, the internal cell voltage. */
   nominalV: number;
   capacityMah: number;
   /** Continuous discharge rating (C). */
   cRating: number;
   /** True if it must stay plugged into mains. */
   tethered?: boolean;
}

export interface RegulatorSpec {
   type: "buck" | "boost" | "buck-boost" | "ldo";
   efficiency: number;
}

export interface MotorSpec {
   ratedRpm: number;
   /** Stall torque at rated voltage (kg·cm). */
   stallTorqueKgCm: number;
   encoder: boolean;
}

export interface ServoSpec {
   /** Stall torque at the top of its voltage range (kg·cm). */
   stallTorqueKgCm: number;
   /** Voltage the torque figure is quoted at. */
   torqueAtV: number;
   feedback: boolean;
   control: "pwm" | "bus";
}

export interface SensorSpec {
   type:
      | "depth-camera"
      | "camera"
      | "lidar"
      | "radar"
      | "ultrasonic"
      | "imu"
      | "tof"
      | "line"
      | "gps"
      | "microphone"
      | "encoder";
   /** What the sensor provides to tests. */
   provides: ("vision" | "depth" | "ranging" | "orientation" | "mapping" | "audio" | "position")[];
   /** Needs a Linux computer (drivers, bandwidth). */
   needsLinuxHost?: boolean;
}

export interface FrameSpec {
   archetype: ArchetypeId;
   locomotion: "wheels-mecanum" | "tracks" | "wheels-ackermann" | "fixed" | "legs";
   /** Drive motors the frame is designed for. */
   motors: number;
   /** Servo joints (degrees of freedom) the frame is designed for. */
   servos: number;
   wheelRadiusM?: number;
   /** Arm reach (m) or leg length (m). */
   reachM?: number;
   /** Legs touching the ground while walking (gait support). */
   supportLegs?: number;
   /** Legged: horizontal lever (m) between the loaded joint and the body's weight. */
   jointLeverM?: number;
   heightM: number;
}

export interface Part {
   id: string;
   name: string;
   category: PartCategory;
   description: string;
   /** Mass in grams. */
   massG: number;
   /** Approximate cost in USD, for the build summary. */
   priceUsd: number;
   ports: Port[];
   compute?: ComputeSpec;
   cooling?: CoolingSpec;
   battery?: BatterySpec;
   regulator?: RegulatorSpec;
   motor?: MotorSpec;
   servo?: ServoSpec;
   sensor?: SensorSpec;
   frame?: FrameSpec;
   /** Parts this one physically mounts on (e.g. an AI HAT on a Raspberry Pi 5). */
   mountsOn?: string[];
   tags?: string[];
}

// ─── Builds ─────────────────────────────────────────────────────────────────

export interface PartInstance {
   /** Unique within the build. */
   uid: string;
   partId: string;
   /** Identical units sharing wiring, e.g. 12 servos on one controller. */
   count: number;
   /** Optional user label. */
   label?: string;
   /** Address set with the board's jumpers, for I²C devices that support it. */
   i2cAddress?: number;
}

export interface PortRef {
   uid: string;
   port: string;
}

export interface Wire {
   id: string;
   from: PortRef;
   to: PortRef;
}

export interface Build {
   name: string;
   archetype: ArchetypeId;
   parts: PartInstance[];
   wires: Wire[];
}

// ─── Results ────────────────────────────────────────────────────────────────

export type Severity = "error" | "warning" | "info";

export type IssueCategory =
   | "completeness"
   | "power"
   | "wiring"
   | "logic-level"
   | "bus"
   | "compute"
   | "thermal"
   | "mechanical";

export interface Issue {
   /** Stable id for de-duplication and tests, e.g. "overvoltage:u3.vin". */
   id: string;
   severity: Severity;
   category: IssueCategory;
   title: string;
   /** Why it matters and how to fix it. */
   detail: string;
   uids: string[];
   wireIds?: string[];
}

export interface PowerNode {
   uid: string;
   portId: string;
   label: string;
   voltage: number;
   maxCurrent: number;
   typicalLoad: number;
   peakLoad: number;
}

export interface BuildStats {
   massG: number;
   priceUsd: number;
   batteryWh: number;
   avgPowerW: number;
   peakPowerW: number;
   runtimeMin: number | null;
   computeTops: number;
   powerNodes: PowerNode[];
}

export interface CheckReport {
   issues: Issue[];
   stats: BuildStats;
   counts: Record<Severity, number>;
   /** No errors. */
   ok: boolean;
}

export type TestVerdict = "pass" | "warn" | "fail";

export interface TestCriterion {
   label: string;
   verdict: TestVerdict;
   detail: string;
}

export interface EnvironmentResult {
   environmentId: string;
   verdict: TestVerdict;
   criteria: TestCriterion[];
}
