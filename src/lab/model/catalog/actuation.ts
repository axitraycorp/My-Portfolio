import type { Part } from "../types";
import { device, host, motorIn, motorOut, powerIn, powerOut } from "../ports";

/* Motor drivers, drive motors, servos and servo controllers. */

export const motorDrivers: Part[] = [
   {
      id: "l298n",
      name: "L298N dual H-bridge",
      category: "motor-driver",
      description:
         "Cheap and robust but inefficient: drops about 2 V and runs hot. Its 5 V regulator only works with motor supplies up to 12 V.",
      massG: 30,
      priceUsd: 6,
      ports: [
         powerIn("vs", "Motor supply VS", 5, 35, 0.04, 0.07),
         powerOut("5v", "5 V out (onboard 78M05)", 5, 0.5, { from: "vs", conversion: "linear" }),
         motorOut("out", "OUT1–4 (2 motors)", 35, 2, 2, "vs"),
         device("ctrl", "ENA/ENB PWM + IN1–4", "pwm", 5, {
            uses: 2,
            accepts3v3: true,
            drivesHost: false,
         }),
      ],
   },
   {
      id: "tb6612fng",
      name: "TB6612FNG dual driver",
      category: "motor-driver",
      description: "Efficient MOSFET driver for small motors up to 13.5 V, 1.2 A per channel.",
      massG: 3,
      priceUsd: 5,
      ports: [
         powerIn("vm", "Motor supply VM", 2.5, 13.5, 0.002, 0.005),
         powerIn("vcc", "Logic VCC", 2.7, 5.5, 0.002, 0.005),
         motorOut("out", "A/B outputs (2 motors)", 13.5, 1.2, 2, "vm"),
         device("ctrl", "PWMA/PWMB + IN pins", "pwm", 5, {
            uses: 2,
            accepts3v3: true,
            drivesHost: false,
         }),
      ],
   },
   {
      id: "drv8833",
      name: "DRV8833 dual driver",
      category: "motor-driver",
      description: "Low-voltage driver (2.7–10.8 V, 1.5 A per channel) for micro gear motors.",
      massG: 2,
      priceUsd: 4,
      ports: [
         powerIn("vm", "Motor supply VM", 2.7, 10.8, 0.002, 0.005),
         motorOut("out", "A/B outputs (2 motors)", 10.8, 1.5, 2, "vm"),
         device("ctrl", "AIN/BIN PWM", "pwm", 5, { uses: 4, accepts3v3: true, drivesHost: false }),
      ],
   },
   {
      id: "bts7960",
      name: "BTS7960 43 A driver",
      category: "motor-driver",
      description: "High-current single-motor driver for big drive motors (5.5–27 V).",
      massG: 66,
      priceUsd: 12,
      ports: [
         powerIn("vm", "Motor supply B+", 5.5, 27, 0.01, 0.02),
         powerIn("vcc", "Logic VCC 5 V", 4.5, 5.5, 0.01, 0.02),
         motorOut("out", "M+ / M- (1 motor)", 27, 43, 1, "vm"),
         device("ctrl", "RPWM/LPWM", "pwm", 5, { uses: 2, accepts3v3: true, drivesHost: false }),
      ],
   },
];

export const motors: Part[] = [
   {
      id: "tt-motor",
      name: "TT gear motor 3–6 V (no encoder)",
      category: "motor",
      description: "Yellow hobby gear motor. Cheap, weak and imprecise — no speed feedback.",
      massG: 30,
      priceUsd: 2,
      ports: [motorIn("m", "Motor terminals", 6, 1.0)],
      motor: { ratedRpm: 200, stallTorqueKgCm: 0.8, encoder: false },
   },
   {
      id: "n20-encoder",
      name: "N20 micro gear motor 6 V + encoder",
      category: "motor",
      description: "Tiny metal-gear motor with a Hall encoder for small rovers.",
      massG: 12,
      priceUsd: 9,
      ports: [
         motorIn("m", "Motor terminals", 6, 0.75),
         device("enc", "Encoder A/B", "gpio", 3.3, { uses: 2, tolerant5v: true }),
      ],
      motor: { ratedRpm: 300, stallTorqueKgCm: 1.0, encoder: true },
   },
   {
      id: "micro-metal-7v4-encoder",
      name: "Micro metal gear motor 7.4 V + encoder",
      category: "motor",
      description: "Compact geared motor with quadrature encoder, sized for 2S LiPo rovers.",
      massG: 50,
      priceUsd: 14,
      ports: [
         motorIn("m", "Motor terminals", 7.4, 1.6),
         device("enc", "Encoder A/B", "gpio", 3.3, { uses: 2, tolerant5v: true }),
      ],
      motor: { ratedRpm: 330, stallTorqueKgCm: 2.5, encoder: true },
   },
   {
      id: "geared-370-12v",
      name: "25 mm geared motor 12 V + encoder",
      category: "motor",
      description: "Mid-size encoder gear motor for 3S rovers and tank chassis.",
      massG: 95,
      priceUsd: 16,
      ports: [
         motorIn("m", "Motor terminals", 12, 2.5),
         device("enc", "Encoder A/B", "gpio", 3.3, { uses: 2, tolerant5v: true }),
      ],
      motor: { ratedRpm: 280, stallTorqueKgCm: 4, encoder: true },
   },
   {
      id: "geared-520-12v",
      name: "37 mm geared motor 12 V + encoder",
      category: "motor",
      description: "High-torque drive motor for heavy rovers and climbing.",
      massG: 160,
      priceUsd: 22,
      ports: [
         motorIn("m", "Motor terminals", 12, 3.2),
         device("enc", "Encoder A/B", "gpio", 3.3, { uses: 2, tolerant5v: true }),
      ],
      motor: { ratedRpm: 330, stallTorqueKgCm: 10, encoder: true },
   },
];

const pwmServoSignal = device("sig", "Signal (PWM)", "pwm", 5, {
   uses: 1,
   accepts3v3: true,
   drivesHost: false,
});

export const servos: Part[] = [
   {
      id: "sg90",
      name: "SG90 micro servo",
      category: "servo",
      description: "9 g plastic-gear servo. Fine for grippers and pan/tilt; too weak for legs.",
      massG: 9,
      priceUsd: 3,
      ports: [powerIn("v", "Servo power", 4.8, 6, 0.1, 0.65), pwmServoSignal],
      servo: { stallTorqueKgCm: 1.8, torqueAtV: 4.8, feedback: false, control: "pwm" },
   },
   {
      id: "mg90s",
      name: "MG90S metal-gear micro servo",
      category: "servo",
      description: "Metal-gear micro servo; small legs and grippers.",
      massG: 14,
      priceUsd: 5,
      ports: [powerIn("v", "Servo power", 4.8, 6, 0.12, 0.7), pwmServoSignal],
      servo: { stallTorqueKgCm: 2.2, torqueAtV: 6, feedback: false, control: "pwm" },
   },
   {
      id: "mg996r",
      name: "MG996R standard servo",
      category: "servo",
      description: "Popular 11 kg·cm metal-gear servo. Draws up to 2.5 A each at stall.",
      massG: 55,
      priceUsd: 8,
      ports: [powerIn("v", "Servo power", 4.8, 7.2, 0.2, 2.5), pwmServoSignal],
      servo: { stallTorqueKgCm: 11, torqueAtV: 6, feedback: false, control: "pwm" },
   },
   {
      id: "ds3218-20kg",
      name: "20 kg·cm digital servo",
      category: "servo",
      description: "High-torque digital servo for arm shoulders and dog legs.",
      massG: 60,
      priceUsd: 15,
      ports: [powerIn("v", "Servo power", 4.8, 6.8, 0.2, 3), pwmServoSignal],
      servo: { stallTorqueKgCm: 21, torqueAtV: 6.8, feedback: false, control: "pwm" },
   },
   {
      id: "bus-servo-15kg",
      name: "Smart bus servo 15 kg·cm",
      category: "servo",
      description:
         "Daisy-chained serial servo with position, voltage and temperature feedback. Needs a servo bus, not PWM.",
      massG: 60,
      priceUsd: 22,
      ports: [
         powerIn("v", "Bus power", 6, 8.4, 0.2, 2.7),
         device("bus", "Servo bus", "bus-servo", 5, { uses: 1 }),
      ],
      servo: { stallTorqueKgCm: 15, torqueAtV: 7.4, feedback: true, control: "bus" },
   },
   {
      id: "bus-servo-35kg",
      name: "High-voltage bus servo 35 kg·cm",
      category: "servo",
      description: "Strong 12 V bus servo for humanoid hips and knees and heavy arms.",
      massG: 70,
      priceUsd: 45,
      ports: [
         powerIn("v", "Bus power", 9, 12.6, 0.25, 3.5),
         device("bus", "Servo bus", "bus-servo", 5, { uses: 1 }),
      ],
      servo: { stallTorqueKgCm: 35, torqueAtV: 12, feedback: true, control: "bus" },
   },
];

export const servoDrivers: Part[] = [
   {
      id: "pca9685",
      name: "PCA9685 16-channel PWM servo board",
      category: "servo-driver",
      description:
         "I²C servo controller (address 0x40). Servo power goes into its V+ terminal — never from a microcontroller pin. Its PCB traces limit the servo rail to about 5 A.",
      massG: 9,
      priceUsd: 7,
      ports: [
         powerIn("vcc", "Logic VCC", 2.3, 5.5, 0.01, 0.01),
         powerIn("vplus", "Servo V+ terminal (optional)", 4.5, 10, 0.001, 0.001, false),
         powerOut("servo-power", "Servo power rail (from V+)", 6, 5, {
            from: "vplus",
            conversion: "passthrough",
            actuatorRail: true,
         }),
         device("i2c", "I²C", "i2c", 3.3, { i2cAddress: 0x40, tolerant5v: true }),
         host("pwm", "Servo channels 0–15", "pwm", 5, 16),
      ],
   },
   {
      id: "bus-servo-adapter",
      name: "Smart-servo bus adapter (USB/UART)",
      category: "servo-driver",
      description:
         "Converts USB or UART to the half-duplex servo bus and passes battery power along the chain.",
      massG: 12,
      priceUsd: 15,
      ports: [
         powerIn("vin", "Servo power in", 6, 12.6, 0.02, 0.05),
         powerOut("bus-power", "Bus power out", 7.4, 10, {
            from: "vin",
            conversion: "passthrough",
            actuatorRail: true,
         }),
         device("usb", "USB to computer", "usb", 5, { uses: 1 }),
         host("bus", "Servo bus", "bus-servo", 5, 32),
      ],
   },
];
