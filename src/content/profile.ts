/**
 * Single source of truth for every fact on the site and in the assistant's
 * system prompt. Unknown details are strings starting with "TODO:"; metrics
 * stay "measuring" until a real measurement exists.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type SectionId =
   | "hero"
   | "robot"
   | "build-log"
   | "results"
   | "projects"
   | "about"
   | "contact";

export type Status = "done" | "active" | "planned";

/** Sensor channel; drives colour (camera = cyan, radar = amber, fused = violet). */
export type Channel = "camera" | "radar" | "fused" | "neutral";

export interface Profile {
   /** Preferred name, shown everywhere on the site. */
   name: string;
   /** Legal name, shown on the CV so it matches visa and ID documents. */
   legalName: string;
   title: string;
   tagline: string;
   /** One-line thesis shown in the hero. */
   thesis: string;
   location: string;
   email: string;
   links: {
      github: string;
      linkedin: string;
      /** Path to a CV under /public, or null until one is added. */
      cv: string | null;
   };
}

export interface Education {
   degree: string;
   institution: string;
   year: number;
   location: string;
   highlights: string[];
}

export interface Experience {
   role: string;
   organisation: string;
   location: string;
   start: number;
   end: number | "present";
   summary: string;
   achievements: string[];
}

export interface SkillGroup {
   id: string;
   title: string;
   skills: string[];
}

/** One row of the "hotel ops → engineering" visual. */
export interface SkillTransfer {
   from: string;
   to: string;
   detail: string;
}

export interface ArchitectureNode {
   id: string;
   label: string;
   channel: Channel;
   /** Column in the wide layout, row in the narrow layout (0 = sensors). */
   layer: number;
   /** Row in the wide layout, column in the narrow layout. Fractions centre a node. */
   lane: number;
   /** ROS 2 topic the node publishes, if any. */
   topic?: string;
}

export interface ArchitectureEdge {
   from: string;
   to: string;
   channel: Channel;
   label?: string;
}

export interface Architecture {
   nodes: ArchitectureNode[];
   edges: ArchitectureEdge[];
}

export interface ProjectMedia {
   /** Image under /public, or null. */
   image: string | null;
   /** Demo video URL (mp4 or embeddable), or null until recorded. */
   video: string | null;
   alt: string;
}

export interface Spec {
   id: "compute" | "arm" | "camera" | "radar" | "middleware" | "perception";
   label: string;
   value: string;
   channel: Channel;
}

export interface Project {
   slug: string;
   title: string;
   summary: string;
   problem: string;
   approach: string[];
   stack: string[];
   status: Status;
   flagship: boolean;
   media: ProjectMedia;
   repoUrl: string | null;
   demoUrl: string | null;
   specs: Spec[];
   architecture: Architecture;
   lessons: string[];
}

export interface Milestone {
   number: number;
   title: string;
   description: string;
   status: Status;
   deliverables: string[];
   /** Ids of metrics measured in this milestone. */
   metrics: string[];
}

export type MetricValue = number | "measuring";

export interface Metric {
   id: string;
   label: string;
   unit: string;
   /** What the baseline column measures, e.g. "PyTorch FP32". */
   baselineLabel: string;
   baseline: MetricValue;
   /** What the optimised column measures, e.g. "TensorRT FP16". */
   optimisedLabel: string;
   optimised: MetricValue;
   /** Milestone number in which this metric is measured. */
   milestone: number;
   higherIsBetter: boolean;
   /** Decimal places when displayed. */
   precision: number;
}

export interface TourStep {
   sectionId: SectionId;
   title: string;
   narration: string;
   /** Optional element id to draw a bounding box around during this step. */
   highlight?: string;
}

/** What a recruiter needs in ten seconds. TODO fields are hidden until filled in. */
export interface RecruiterSummary {
   /** Roles being applied for. */
   targetRoles: string[];
   /** e.g. "Available now", "From March 2027". */
   availability: string;
   /** e.g. "Australian citizen", "Full work rights in the EU". */
   workRights: string;
   /** Work arrangements open to, e.g. "Full-time", "Hybrid", "Relocation". */
   openTo: string[];
   /** Three short, factual proof points. */
   highlights: string[];
   /** One-paragraph professional summary used on the CV. */
   summary: string;
}

// ─── Profile ────────────────────────────────────────────────────────────────

export const recruiter: RecruiterSummary = {
   targetRoles: [
      "Web Developer",
      "AI Developer",
      "Robotics Software Engineer",
      "Perception / Edge AI Engineer",
      "Machine Learning Engineer",
      "Automation Programmer",
   ],
   availability: "TODO: e.g. Available now / notice period",
   workRights:
      "Full work rights in Australia — Temporary Graduate visa (subclass 485), valid until 31 Aug 2029",
   openTo: ["Full-time", "Relocation anywhere for the right opportunity"],
   highlights: [
      "Master of Data Science (2024)",
      "Hotel Manager: lifted Rosehill Hotel's gaming ranking (AHA & MAX) from Sydney's top 20–30 to the top 10",
      "Building a camera–radar perception arm on an NVIDIA Jetson, in public",
      "Built this site end to end: Next.js, NestJS, PostgreSQL and a Claude-powered AI guide",
   ],
   summary:
      "Robotics, AI and web developer with a Master of Data Science and two years managing 24/7 hotel operations in Sydney — including lifting Rosehill Hotel's gaming ranking on the AHA and MAX systems from the top 20–30 to the top 10. Currently building a camera–radar perception arm on an NVIDIA Jetson Orin Nano with ROS 2, TensorRT and MoveIt 2, documented as an open build log with measured results. Also builds full-stack web applications — this portfolio is a Next.js and NestJS app with a PostgreSQL backend and a Claude-powered AI guide. Brings the operational discipline of hospitality — reliability, calm incident handling, clear communication — to engineering work.",
};

export const profile: Profile = {
   name: "Hagon Nguyen",
   legalName: "Viet Hoang Nguyen",
   title: "Robotics & Edge AI Engineer",
   tagline: "From running a hotel to building robots that see.",
   thesis:
      "I build robot perception that runs on the edge — camera and radar, fused on a Jetson, driving a real arm.",
   location: "Sydney, NSW, Australia",
   email: "axitray@gmail.com",
   links: {
      github: "https://github.com/axitraycorp",
      linkedin: "https://www.linkedin.com/in/hn-axi-tray/",
      cv: null, // TODO: add /public/cv.pdf and set this to "/cv.pdf"
   },
};

export const education: Education[] = [
   {
      degree: "Master of Data Science",
      institution: "Macquarie University",
      year: 2024,
      location: "Sydney, NSW",
      highlights: [
         "TODO: thesis or capstone topic",
         "TODO: notable coursework (e.g. deep learning, time series)",
      ],
   },
];

export const experience: Experience[] = [
   {
      role: "Hotel Manager",
      organisation: "Rosehill Hotel · The Vauxhall Inn",
      location: "Sydney, NSW",
      start: 2024,
      end: 2026,
      summary:
         "Ran day-to-day operations of a 24/7 business: people, guests, budgets and incidents — the same pressures a robot in the field faces.",
      achievements: [
         "Rosehill Hotel: lifted the venue's gaming ranking on the AHA and MAX systems from the top 20–30 to the top 10 in Sydney",
         "The Vauxhall Inn: now applying the same approach to improve the venue's gaming rankings",
         "TODO: team size and departments led (e.g. front office, housekeeping, F&B)",
         "TODO: a process or system you introduced (e.g. new PMS workflow, SOPs)",
      ],
   },
];

export const skillGroups: SkillGroup[] = [
   {
      id: "robotics",
      title: "Robotics",
      skills: ["ROS 2", "MoveIt 2", "URDF & TF2", "Hand–eye calibration"],
   },
   {
      id: "perception",
      title: "Perception & edge AI",
      skills: ["YOLO", "TensorRT", "ONNX", "OpenCV", "Camera–radar fusion", "NVIDIA Jetson"],
   },
   {
      id: "data",
      title: "Data science",
      skills: [
         "Python",
         "pandas",
         "scikit-learn",
         "Time-series forecasting",
         "SQL",
         "Experiment design",
      ],
   },
   {
      id: "software",
      title: "Software",
      skills: ["TypeScript", "Next.js", "NestJS", "PostgreSQL", "Docker", "Git & CI"],
   },
];

/** About-section narrative, one paragraph per entry. TODO: review the wording in your own voice. */
export const aboutStory: string[] = [
   "Before robots, I ran a hotel. As Hotel Manager from 2024 to 2026 I was responsible for a business that never closes: people to lead, guests to look after, budgets to hit and incidents to solve at any hour.",
   "With a Master of Data Science (2024) behind me, I wanted to work on a harder question: what does it take for a machine to understand a room — what is there, and exactly where?",
   "This robot is my answer, built in public. The engineering is new; the habits are not — plan the operation, measure everything, keep it running, and explain it clearly.",
];

export const skillTransfers: SkillTransfer[] = [
   {
      from: "Running a 24/7 operation",
      to: "Designing for reliability",
      detail:
         "A hotel never closes. Neither should a robot's perception stack — watchdogs, health topics, graceful degradation.",
   },
   {
      from: "Handling incidents under pressure",
      to: "Debugging and root-cause analysis",
      detail:
         "Overbookings and outages taught calm triage: reproduce, isolate, fix, then write it down.",
   },
   {
      from: "Forecasting occupancy and staffing",
      to: "Data-driven planning",
      detail: "Planning from noisy demand data is time-series modelling with real consequences.",
   },
   {
      from: "SOPs and checklists",
      to: "Reproducible pipelines",
      detail: "Standard operating procedures become launch files, tests and CI.",
   },
   {
      from: "Coordinating departments",
      to: "Integrating subsystems",
      detail:
         "Front office, housekeeping and maintenance ↔ perception, planning and control: interfaces matter most.",
   },
   {
      from: "Explaining things to guests",
      to: "Clear technical communication",
      detail: "Demos, write-ups and docs that a non-specialist can follow.",
   },
];

// ─── Projects ───────────────────────────────────────────────────────────────

export const projects: Project[] = [
   {
      slug: "perception-arm",
      title: "Camera–Radar Perception Arm",
      summary:
         "A robot arm that finds and grasps objects using a camera and an mmWave radar fused on an NVIDIA Jetson Orin Nano.",
      problem:
         "Cameras are great at what an object is but weak at exactly where it is, and they fail in glare or low light. mmWave radar measures range and velocity reliably but cannot tell a cup from a can. A grasping robot needs both, running in real time on a small edge computer.",
      approach: [
         "Bring up the hardware on ROS 2: Jetson Orin Nano, arm driver, camera and mmWave radar publishing on standard topics with a clean TF tree.",
         "Export a YOLO detector to TensorRT and benchmark it against the PyTorch baseline on the Jetson.",
         "Integrate the radar as a ROS 2 point cloud and filter it by range and velocity.",
         "Fuse camera detections with radar points: project radar into the image, associate points with boxes, and track fused objects over time.",
         "Calibrate the camera to the arm (hand–eye) and plan grasps with MoveIt 2 from fused 3D object positions.",
         "Run an end-to-end pick-and-place demo and measure grasp success over 50 trials.",
      ],
      stack: [
         "ROS 2",
         "NVIDIA Jetson Orin Nano",
         "TensorRT",
         "YOLO",
         "MoveIt 2",
         "OpenCV",
         "Python",
         "C++",
      ],
      status: "active",
      flagship: true,
      media: {
         image: null,
         video: null, // TODO: add demo video URL after milestone 6
         alt: "Robot arm with a camera and mmWave radar mounted at its base",
      },
      repoUrl: null, // TODO: public repo URL
      demoUrl: null,
      specs: [
         {
            id: "compute",
            label: "Compute",
            value: "NVIDIA Jetson Orin Nano (TODO: 4 GB or 8 GB)",
            channel: "neutral",
         },
         {
            id: "arm",
            label: "Arm",
            value: "TODO: arm model and degrees of freedom",
            channel: "neutral",
         },
         { id: "camera", label: "Camera", value: "TODO: camera model", channel: "camera" },
         { id: "radar", label: "Radar", value: "TODO: mmWave radar model", channel: "radar" },
         {
            id: "middleware",
            label: "Middleware",
            value: "ROS 2 (TODO: distro)",
            channel: "neutral",
         },
         {
            id: "perception",
            label: "Perception",
            value: "TensorRT YOLO + camera–radar fusion",
            channel: "fused",
         },
      ],
      architecture: {
         nodes: [
            {
               id: "camera",
               label: "Camera",
               channel: "camera",
               layer: 0,
               lane: 0,
               topic: "/camera/image_raw",
            },
            {
               id: "radar",
               label: "mmWave radar",
               channel: "radar",
               layer: 0,
               lane: 1,
               topic: "/radar/raw",
            },
            {
               id: "detector",
               label: "TensorRT YOLO",
               channel: "camera",
               layer: 1,
               lane: 0,
               topic: "/perception/detections",
            },
            {
               id: "pointcloud",
               label: "Point cloud",
               channel: "radar",
               layer: 1,
               lane: 1,
               topic: "/radar/points",
            },
            {
               id: "fusion",
               label: "Fusion + tracking",
               channel: "fused",
               layer: 2,
               lane: 0.5,
               topic: "/fusion/tracks",
            },
            {
               id: "moveit",
               label: "MoveIt 2",
               channel: "neutral",
               layer: 3,
               lane: 0.5,
               topic: "/arm/trajectory",
            },
            {
               id: "arm",
               label: "Arm",
               channel: "neutral",
               layer: 4,
               lane: 0.5,
               topic: "/arm/joint_states",
            },
         ],
         edges: [
            { from: "camera", to: "detector", channel: "camera", label: "image" },
            { from: "radar", to: "pointcloud", channel: "radar", label: "raw" },
            { from: "detector", to: "fusion", channel: "camera", label: "boxes" },
            { from: "pointcloud", to: "fusion", channel: "radar", label: "points" },
            { from: "fusion", to: "moveit", channel: "fused", label: "3D tracks" },
            { from: "moveit", to: "arm", channel: "neutral", label: "trajectory" },
         ],
      },
      lessons: ["TODO: lessons learned — add as milestones complete"],
   },
   {
      slug: "guest-service-agent",
      title: "LLM Guest-Service Agent",
      summary:
         "A tool-using LLM agent that answers hotel guest requests, backed by an evaluation suite that scores accuracy, safety and escalation.",
      problem:
         "Front desks spend hours on repetitive questions — checkout times, late arrivals, amenities — while guests expect instant, accurate answers. A chatbot that guesses is worse than none, so the agent must be measurably reliable before it talks to a guest.",
      approach: [
         "Ground the agent in hotel policies and live booking data through tools rather than free text.",
         "Escalate to a human when the request is out of scope or confidence is low.",
         "Build an eval suite of realistic guest conversations with graded expectations: correct answer, correct refusal, correct escalation.",
         "Track eval scores on every change so prompt and model updates can't silently regress.",
      ],
      stack: ["Python", "LLM tool use", "Retrieval", "pytest eval harness"],
      status: "planned",
      flagship: false,
      media: { image: null, video: null, alt: "Chat between a hotel guest and the service agent" },
      repoUrl: null,
      demoUrl: null,
      specs: [],
      architecture: {
         nodes: [
            { id: "guest", label: "Guest message", channel: "camera", layer: 0, lane: 0.5 },
            { id: "agent", label: "LLM agent", channel: "fused", layer: 1, lane: 0.5 },
            { id: "tools", label: "Policy + booking tools", channel: "radar", layer: 2, lane: 0 },
            { id: "human", label: "Human handoff", channel: "neutral", layer: 2, lane: 1 },
            { id: "evals", label: "Eval suite", channel: "neutral", layer: 3, lane: 0.5 },
         ],
         edges: [
            { from: "guest", to: "agent", channel: "camera" },
            { from: "agent", to: "tools", channel: "radar", label: "tool calls" },
            { from: "agent", to: "human", channel: "neutral", label: "escalate" },
            { from: "tools", to: "evals", channel: "fused", label: "scored" },
            { from: "human", to: "evals", channel: "neutral" },
         ],
      },
      lessons: ["TODO: lessons learned once built"],
   },
   {
      slug: "occupancy-forecasting",
      title: "Hotel Occupancy Forecasting & Pricing",
      summary:
         "Forecast nightly occupancy from booking pace and seasonality, then recommend room rates — built from first-hand hotel operations experience.",
      problem:
         "Hotels price rooms on gut feel and last year's numbers. Booking pace, events and seasonality carry real signal, and a forecast that a manager trusts can lift revenue without overpricing slow nights.",
      approach: [
         "Model occupancy per night from booking pace (on-the-books by days-to-arrival), seasonality and calendar events.",
         "Compare simple baselines (same-day-last-year, pickup models) against machine-learning forecasters with honest backtesting.",
         "Turn forecasts into rate recommendations with guardrails a revenue manager can override.",
         "Present it as a dashboard a non-technical manager can use daily.",
      ],
      stack: ["Python", "pandas", "scikit-learn", "Time-series backtesting", "SQL"],
      status: "planned",
      flagship: false,
      media: {
         image: null,
         video: null,
         alt: "Occupancy forecast chart with recommended room rates",
      },
      repoUrl: null,
      demoUrl: null,
      specs: [],
      architecture: {
         nodes: [
            { id: "bookings", label: "Booking history", channel: "camera", layer: 0, lane: 0 },
            { id: "calendar", label: "Events + seasonality", channel: "radar", layer: 0, lane: 1 },
            { id: "forecast", label: "Occupancy forecast", channel: "fused", layer: 1, lane: 0.5 },
            { id: "pricing", label: "Rate recommender", channel: "neutral", layer: 2, lane: 0.5 },
            {
               id: "dashboard",
               label: "Manager dashboard",
               channel: "neutral",
               layer: 3,
               lane: 0.5,
            },
         ],
         edges: [
            { from: "bookings", to: "forecast", channel: "camera", label: "pace" },
            { from: "calendar", to: "forecast", channel: "radar", label: "features" },
            { from: "forecast", to: "pricing", channel: "fused" },
            { from: "pricing", to: "dashboard", channel: "neutral" },
         ],
      },
      lessons: ["TODO: lessons learned once built"],
   },
];

// ─── Build log ──────────────────────────────────────────────────────────────

export const milestones: Milestone[] = [
   {
      number: 1,
      title: "Hardware bring-up",
      description: "Every sensor and the arm talking ROS 2 on the Jetson, with a correct TF tree.",
      status: "active",
      deliverables: [
         "Jetson Orin Nano flashed with JetPack and ROS 2",
         "Arm driver publishing joint states and accepting trajectories",
         "Camera and radar drivers publishing on ROS 2 topics",
         "URDF and TF tree for arm, camera and radar mounts",
      ],
      metrics: [],
   },
   {
      number: 2,
      title: "TensorRT edge perception",
      description:
         "A YOLO detector exported to TensorRT and benchmarked against PyTorch on the Jetson.",
      status: "planned",
      deliverables: [
         "YOLO → ONNX → TensorRT engine build script",
         "ROS 2 detector node publishing detections",
         "Benchmark report: throughput and p95 latency, PyTorch vs TensorRT",
      ],
      metrics: ["detector-fps", "latency-p95"],
   },
   {
      number: 3,
      title: "Radar integration",
      description: "mmWave radar as a filtered ROS 2 point cloud with measured range accuracy.",
      status: "planned",
      deliverables: [
         "Radar driver publishing PointCloud2",
         "Range and velocity filtering node",
         "Range-accuracy test against measured distances",
      ],
      metrics: ["radar-range-error"],
   },
   {
      number: 4,
      title: "Camera–radar fusion",
      description:
         "Radar points projected into the image, associated with detections and tracked over time.",
      status: "planned",
      deliverables: [
         "Camera–radar extrinsic calibration",
         "Association of radar points to detection boxes",
         "Multi-object tracker publishing fused 3D tracks",
      ],
      metrics: ["fusion-match-rate"],
   },
   {
      number: 5,
      title: "Hand–eye calibration and grasping",
      description:
         "Camera calibrated to the arm, and grasps planned with MoveIt 2 from fused positions.",
      status: "planned",
      deliverables: [
         "Hand–eye calibration procedure and result",
         "MoveIt 2 planning scene with sensors and table",
         "Grasp pose generation from fused tracks",
      ],
      metrics: ["calibration-error"],
   },
   {
      number: 6,
      title: "End-to-end demo",
      description: "Detect, localise, grasp and place — evaluated over 50 trials and recorded.",
      status: "planned",
      deliverables: [
         "Pick-and-place pipeline from one launch file",
         "50-trial grasp evaluation",
         "Demo video and write-up",
      ],
      metrics: ["grasp-success"],
   },
];

export const metrics: Metric[] = [
   {
      id: "detector-fps",
      label: "Detector throughput",
      unit: "FPS",
      baselineLabel: "PyTorch FP32",
      baseline: "measuring",
      optimisedLabel: "TensorRT FP16",
      optimised: "measuring",
      milestone: 2,
      higherIsBetter: true,
      precision: 1,
   },
   {
      id: "latency-p95",
      label: "Perception latency (p95)",
      unit: "ms",
      baselineLabel: "PyTorch FP32",
      baseline: "measuring",
      optimisedLabel: "TensorRT FP16",
      optimised: "measuring",
      milestone: 2,
      higherIsBetter: false,
      precision: 1,
   },
   {
      id: "radar-range-error",
      label: "Radar range error",
      unit: "cm",
      baselineLabel: "Raw",
      baseline: "measuring",
      optimisedLabel: "Filtered",
      optimised: "measuring",
      milestone: 3,
      higherIsBetter: false,
      precision: 1,
   },
   {
      id: "fusion-match-rate",
      label: "Fusion match rate",
      unit: "%",
      baselineLabel: "Nearest neighbour",
      baseline: "measuring",
      optimisedLabel: "Gated + tracked",
      optimised: "measuring",
      milestone: 4,
      higherIsBetter: true,
      precision: 1,
   },
   {
      id: "calibration-error",
      label: "Hand–eye calibration error",
      unit: "mm",
      baselineLabel: "Initial estimate",
      baseline: "measuring",
      optimisedLabel: "Refined",
      optimised: "measuring",
      milestone: 5,
      higherIsBetter: false,
      precision: 1,
   },
   {
      id: "grasp-success",
      label: "Grasp success (50 trials)",
      unit: "%",
      baselineLabel: "Camera only",
      baseline: "measuring",
      optimisedLabel: "Camera + radar",
      optimised: "measuring",
      milestone: 6,
      higherIsBetter: true,
      precision: 0,
   },
];

// ─── Tour ───────────────────────────────────────────────────────────────────

export const tourSteps: TourStep[] = [
   {
      sectionId: "hero",
      title: "Boot complete",
      narration: `Hi, I'm Unit-7. I live on ${profile.name}'s robot. Sensors are up. Let me show you around.`,
   },
   {
      sectionId: "robot",
      title: "The robot",
      narration:
         "This is my body. A Jetson Orin Nano for a brain, an arm, a camera and an mmWave radar. The camera tells me what things are. The radar tells me where they are. Together they let me grab them.",
      highlight: "architecture",
   },
   {
      sectionId: "build-log",
      title: "Build log",
      narration:
         "I'm being built in six milestones, out in the open. Milestone 1, hardware bring-up, is in progress right now.",
   },
   {
      sectionId: "results",
      title: "Results",
      narration:
         "Every claim gets a number. These metrics are still measuring — no made-up figures here. They fill in as each milestone lands.",
   },
   {
      sectionId: "projects",
      title: "Other projects",
      narration:
         "Two side projects come from hotel life: an LLM guest-service agent with a proper eval suite, and occupancy forecasting with pricing. Both are planned.",
   },
   {
      sectionId: "about",
      title: "Hotel to robotics",
      narration: `${profile.name} ran a hotel before building robots. Uptime, incidents, forecasting, teams — it all transfers. Plus a Master of Data Science.`,
   },
   {
      sectionId: "contact",
      title: "Say hello",
      narration:
         "That's the tour. Want to talk robots, perception or operations? Send a message. I'll make sure it gets through.",
   },
];

export const sections: { id: SectionId; label: string }[] = [
   { id: "hero", label: "Home" },
   { id: "robot", label: "Robot" },
   { id: "build-log", label: "Build log" },
   { id: "results", label: "Results" },
   { id: "projects", label: "Projects" },
   { id: "about", label: "About" },
   { id: "contact", label: "Contact" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

export const flagship: Project = projects.find((p) => p.flagship) ?? projects[0];

export function getProject(slug: string): Project | undefined {
   return projects.find((p) => p.slug === slug);
}

export function getMetric(id: string): Metric | undefined {
   return metrics.find((m) => m.id === id);
}

/** The milestone currently in progress, or the next planned one. */
export function currentMilestone(): Milestone | undefined {
   return (
      milestones.find((m) => m.status === "active") ??
      milestones.find((m) => m.status === "planned")
   );
}

export function isTodo(value: string | null | undefined): boolean {
   return typeof value === "string" && value.startsWith("TODO:");
}
