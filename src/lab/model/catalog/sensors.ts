import type { Part } from "../types";
import { device, powerIn } from "../ports";

export const sensors: Part[] = [
   {
      id: "depth-camera-usb",
      name: "RGB-D depth camera (USB 3)",
      category: "camera",
      description:
         "Colour + depth (stereo/IR). Needs a Linux computer with USB 3 for drivers and bandwidth.",
      massG: 80,
      priceUsd: 160,
      ports: [
         powerIn("usb5v", "USB bus power", 4.75, 5.25, 0.7, 1.5),
         device("usb", "USB 3", "usb", 5, { uses: 1 }),
      ],
      sensor: { type: "depth-camera", provides: ["vision", "depth", "ranging"], needsLinuxHost: true },
   },
   {
      id: "csi-camera-12mp",
      name: "12 MP CSI camera module",
      category: "camera",
      description: "Ribbon-cable camera, powered by the host. Needs a CSI port (Raspberry Pi / Jetson).",
      massG: 4,
      priceUsd: 25,
      ports: [device("csi", "CSI ribbon", "csi", 3.3, { uses: 1 })],
      sensor: { type: "camera", provides: ["vision"], needsLinuxHost: true },
   },
   {
      id: "usb-webcam",
      name: "1080p USB camera",
      category: "camera",
      description: "Plain USB UVC camera; easy to use, no depth.",
      massG: 60,
      priceUsd: 30,
      ports: [
         powerIn("usb5v", "USB bus power", 4.75, 5.25, 0.25, 0.35),
         device("usb", "USB 2", "usb", 5, { uses: 1 }),
      ],
      sensor: { type: "camera", provides: ["vision"], needsLinuxHost: true },
   },
   {
      id: "lidar-2d",
      name: "360° 2D LiDAR (dToF, 12 m)",
      category: "sensor",
      description:
         "Spinning time-of-flight scanner for SLAM and obstacle avoidance. The motor draws extra current at spin-up.",
      massG: 190,
      priceUsd: 99,
      ports: [
         powerIn("5v", "5 V", 4.8, 5.2, 0.35, 0.6),
         device("usb", "USB (via adapter)", "usb", 5, { uses: 1 }),
      ],
      sensor: { type: "lidar", provides: ["ranging", "mapping"], needsLinuxHost: true },
   },
   {
      id: "mmwave-radar",
      name: "60 GHz mmWave radar module",
      category: "sensor",
      description:
         "Measures range and velocity through dust, smoke and darkness. Low resolution — pair it with a camera.",
      massG: 30,
      priceUsd: 45,
      ports: [
         powerIn("5v", "5 V", 4.5, 5.5, 0.5, 0.8),
         device("uart", "UART (3.3 V)", "uart", 3.3, { uses: 1 }),
      ],
      sensor: { type: "radar", provides: ["ranging"] },
   },
   {
      id: "hc-sr04",
      name: "HC-SR04 ultrasonic sensor",
      category: "sensor",
      description:
         "5 V-only rangefinder. Its ECHO pin outputs 5 V — use a divider or level shifter on 3.3 V boards.",
      massG: 9,
      priceUsd: 2,
      ports: [
         powerIn("vcc", "VCC 5 V", 4.5, 5.5, 0.015, 0.02),
         device("io", "TRIG / ECHO", "gpio", 5, { uses: 2 }),
      ],
      sensor: { type: "ultrasonic", provides: ["ranging"] },
   },
   {
      id: "line-sensor-5ch",
      name: "5-channel IR line sensor",
      category: "sensor",
      description: "Line-following array. Outputs at its supply voltage.",
      massG: 12,
      priceUsd: 6,
      ports: [
         powerIn("vcc", "VCC 3.3–5 V", 3.3, 5.5, 0.05, 0.06),
         device("io", "OUT1–5", "gpio", 5, { uses: 5 }),
      ],
      sensor: { type: "line", provides: ["position"] },
   },
   {
      id: "mpu6050",
      name: "MPU-6050 IMU module",
      category: "sensor",
      description: "6-axis accelerometer + gyro at I²C 0x68. Module has an LDO and 3.3 V pull-ups.",
      massG: 3,
      priceUsd: 3,
      ports: [
         powerIn("vcc", "VCC 3.3–5 V", 3, 5.5, 0.004, 0.005),
         device("i2c", "I²C", "i2c", 3.3, { i2cAddress: 0x68 }),
      ],
      sensor: { type: "imu", provides: ["orientation"] },
   },
   {
      id: "bno055",
      name: "BNO055 9-DOF IMU",
      category: "sensor",
      description: "Absolute orientation with on-chip fusion, I²C 0x28.",
      massG: 3,
      priceUsd: 35,
      ports: [
         powerIn("vcc", "VIN 3.3–5 V", 3, 5.5, 0.012, 0.015),
         device("i2c", "I²C", "i2c", 3.3, { i2cAddress: 0x28, tolerant5v: true }),
      ],
      sensor: { type: "imu", provides: ["orientation"] },
   },
   {
      id: "vl53l0x",
      name: "VL53L0X ToF distance sensor",
      category: "sensor",
      description:
         "Laser distance up to 2 m at fixed I²C address 0x29 — two of them conflict unless you re-address them at boot.",
      massG: 2,
      priceUsd: 5,
      ports: [
         powerIn("vcc", "VIN 2.6–5.5 V", 2.6, 5.5, 0.019, 0.04),
         device("i2c", "I²C", "i2c", 3.3, { i2cAddress: 0x29, tolerant5v: true }),
      ],
      sensor: { type: "tof", provides: ["ranging"] },
   },
   {
      id: "gps-m8n",
      name: "GNSS / GPS module",
      category: "sensor",
      description: "Outdoor position over UART; useless indoors.",
      massG: 20,
      priceUsd: 25,
      ports: [
         powerIn("vcc", "VCC 3.3–5 V", 3.3, 5.5, 0.05, 0.07),
         device("uart", "UART", "uart", 3.3, { uses: 1 }),
      ],
      sensor: { type: "gps", provides: ["position"] },
   },
   {
      id: "voice-module",
      name: "AI voice module (mic array + speaker)",
      category: "sensor",
      description:
         "USB microphone array with speaker and wake-word engine, for voice commands with a speech or language model.",
      massG: 45,
      priceUsd: 40,
      ports: [
         powerIn("usb5v", "USB bus power", 4.75, 5.25, 0.3, 0.8),
         device("usb", "USB audio", "usb", 5, { uses: 1 }),
      ],
      sensor: { type: "microphone", provides: ["audio"], needsLinuxHost: true },
   },
];
