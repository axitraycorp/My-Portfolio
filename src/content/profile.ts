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

/** Sensor channel; drives colour (camera = cyan, LiDAR = amber, fused = violet). */
export type Channel = "camera" | "lidar" | "fused" | "neutral";

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
   /** Optional position for the narrow (phone) layout when layer/lane would overlap there. */
   narrow?: { layer: number; lane: number };
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
   id: "compute" | "base" | "arm" | "camera" | "lidar" | "voice" | "middleware";
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
   availability: "Available now",
   workRights:
      "Full work rights in Australia — Temporary Graduate visa (subclass 485), valid until 31 Aug 2029",
   openTo: ["Full-time", "Relocation anywhere for the right opportunity"],
   highlights: [
      "Master of Data Science (2024)",
      "Hotel Manager: lifted Rosehill Hotel's gaming ranking (AHA & MAX) from Sydney's top 20–30 to the top 10",
      "Building a Jetson mobile manipulator in public: depth camera + LiDAR, SLAM, MoveIt 2",
      "Built this site end to end: Next.js, NestJS, PostgreSQL and a Claude-powered AI guide",
   ],
   summary:
      "Robotics, AI and web developer with a Master of Data Science and two years managing 24/7 hotel operations in Sydney — including lifting Rosehill Hotel's gaming ranking on the AHA and MAX systems from the top 20–30 to the top 10. Currently building a mobile manipulator on an NVIDIA Jetson Orin Nano — depth camera and LiDAR fusion, SLAM navigation and MoveIt 2 grasping with ROS 2 and TensorRT — documented as an open build log with measured results. Also builds full-stack web applications — this portfolio is a Next.js and NestJS app with a PostgreSQL backend and a Claude-powered AI guide. Brings the operational discipline of hospitality — reliability, calm incident handling, clear communication — to engineering work.",
};

export const profile: Profile = {
   name: "Hagon Nguyen",
   legalName: "Viet Hoang Nguyen",
   title: "Robotics & Edge AI Engineer",
   tagline: "From running a hotel to building robots that see.",
   thesis:
      "I build robots that see and act on the edge — a depth camera and LiDAR fused on a Jetson, on a robot that maps, drives and grasps.",
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
         "Led teams of 14–20 staff at each venue",
         "TODO: a process or system you introduced (e.g. new PMS workflow, SOPs)",
      ],
   },
];

export const skillGroups: SkillGroup[] = [
   {
      id: "robotics",
      title: "Robotics",
      skills: ["ROS 2", "SLAM & Nav2", "MoveIt 2", "URDF & TF2", "Hand–eye calibration"],
   },
   {
      id: "perception",
      title: "Perception & edge AI",
      skills: ["YOLO", "TensorRT", "ONNX", "OpenCV", "Camera–LiDAR fusion", "NVIDIA Jetson"],
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
      slug: "mobile-manipulator",
      title: "Jetson Mobile Manipulator",
      summary:
         "A mecanum-wheeled robot with a vision-guided arm that maps a room, drives to objects and picks them up — a depth camera and TOF LiDAR fused on an NVIDIA Jetson Orin Nano.",
      problem:
         "To fetch an object, a robot has to know where it is, what it is looking at, and exactly where that object sits in 3D — then move its base and its arm to reach it. A depth camera recognises objects but loses accuracy with distance and glare; a LiDAR measures geometry precisely but cannot tell a cup from a can. Doing all of this on board, in real time, needs GPU-accelerated perception on a small edge computer.",
      approach: [
         "Upgrade the kit from its Raspberry Pi 5 to an NVIDIA Jetson Orin Nano and bring everything up on ROS 2: base and arm via the RRC Lite controller, wheel odometry and IMU, depth camera and TOF LiDAR, with a clean URDF and TF tree.",
         "Export a YOLO detector to TensorRT and benchmark it against the PyTorch baseline on the Jetson.",
         "Map the room with LiDAR SLAM, localise with AMCL and navigate to goals with Nav2 on the mecanum base.",
         "Fuse camera detections with depth and LiDAR to place each object in 3D in the map frame, and track it over time.",
         "Calibrate the wrist camera to the arm (hand–eye) and plan grasps with MoveIt 2 from the fused 3D positions.",
         "Run end to end — find an object, drive to it, pick it up and deliver it — and measure success over 50 trials.",
         'Add voice control: speech in and out through the WonderEcho Pro, with a language model turning requests like "bring me the cup" into navigation and grasp tasks grounded in what the robot can see.',
      ],
      stack: [
         "ROS 2 Humble",
         "NVIDIA Jetson Orin Nano",
         "TensorRT",
         "YOLO",
         "SLAM Toolbox",
         "Nav2",
         "MoveIt 2",
         "LLM voice commands",
         "OpenCV",
         "Python",
         "C++",
      ],
      status: "active",
      flagship: true,
      media: {
         image: null,
         video: null, // TODO: add demo video URL after milestone 6
         alt: "Mecanum-wheeled mobile robot with a servo arm, a wrist-mounted depth camera, a TOF LiDAR and a voice box",
      },
      repoUrl: null, // TODO: public repo URL
      demoUrl: null,
      specs: [
         {
            id: "compute",
            label: "Compute",
            value: "NVIDIA Jetson Orin Nano 8 GB — upgraded from the kit's Raspberry Pi 5 · RRC Lite motor/servo controller",
            channel: "neutral",
         },
         {
            id: "base",
            label: "Mobile base",
            value: "Mecanum, anodised aluminium · 212 × 174 × 441 mm, 1.79 kg · 4 × 310 geared motors with quadrature encoders · 7.4 V 2200 mAh LiPo (~60 min)",
            channel: "neutral",
         },
         {
            id: "arm",
            label: "Arm",
            value: "HX-06L smart bus servos, gripper on a rotating turret · links 74 / 74 / 140 mm",
            channel: "neutral",
         },
         {
            id: "camera",
            label: "Camera",
            value: "Aurora930 Pro 3D depth camera (RGB + depth), wrist-mounted",
            channel: "camera",
         },
         {
            id: "lidar",
            label: "LiDAR",
            value: "MS200 TOF LiDAR on the chassis, for SLAM and obstacle avoidance",
            channel: "lidar",
         },
         {
            id: "voice",
            label: "Voice",
            value: "WonderEcho Pro AI voice box — wake word, speech recognition and speech synthesis",
            channel: "fused",
         },
         {
            id: "middleware",
            label: "Software",
            value: "ROS 2 Humble · TensorRT · Nav2 · MoveIt 2",
            channel: "fused",
         },
      ],
      architecture: {
         nodes: [
            {
               id: "camera",
               label: "Depth camera",
               channel: "camera",
               layer: 0,
               lane: 0,
               topic: "/camera/color/image_raw",
            },
            {
               id: "lidar",
               label: "TOF LiDAR",
               channel: "lidar",
               layer: 0,
               lane: 1,
               topic: "/scan",
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
               id: "slam",
               label: "SLAM + AMCL",
               channel: "lidar",
               layer: 1,
               lane: 1,
               topic: "/map · /amcl_pose",
            },
            {
               id: "fusion",
               label: "3D object fusion",
               channel: "fused",
               layer: 2,
               lane: 0.5,
               narrow: { layer: 2, lane: 0 },
               topic: "/perception/objects",
            },
            {
               id: "voice",
               label: "Voice + LLM",
               channel: "fused",
               layer: 2,
               lane: 1,
               narrow: { layer: 2, lane: 1 },
               topic: "/voice/task",
            },
            {
               id: "planning",
               label: "Nav2 + MoveIt 2",
               channel: "neutral",
               layer: 3,
               lane: 0.5,
               topic: "/cmd_vel · /arm/cmd",
            },
            {
               id: "robot",
               label: "Base + arm",
               channel: "neutral",
               layer: 4,
               lane: 0.5,
               topic: "/joint_states",
            },
         ],
         edges: [
            { from: "camera", to: "detector", channel: "camera", label: "image" },
            { from: "lidar", to: "slam", channel: "lidar", label: "scan" },
            { from: "detector", to: "fusion", channel: "camera", label: "boxes + depth" },
            { from: "slam", to: "fusion", channel: "lidar", label: "pose + map" },
            { from: "fusion", to: "planning", channel: "fused", label: "3D targets" },
            { from: "voice", to: "planning", channel: "fused", label: "task" },
            { from: "planning", to: "robot", channel: "neutral", label: "commands" },
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
            { id: "tools", label: "Policy + booking tools", channel: "lidar", layer: 2, lane: 0 },
            { id: "human", label: "Human handoff", channel: "neutral", layer: 2, lane: 1 },
            { id: "evals", label: "Eval suite", channel: "neutral", layer: 3, lane: 0.5 },
         ],
         edges: [
            { from: "guest", to: "agent", channel: "camera" },
            { from: "agent", to: "tools", channel: "lidar", label: "tool calls" },
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
            { id: "calendar", label: "Events + seasonality", channel: "lidar", layer: 0, lane: 1 },
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
            { from: "calendar", to: "forecast", channel: "lidar", label: "features" },
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
      title: "Jetson upgrade and bring-up",
      description:
         "The kit moved from its Raspberry Pi 5 to a Jetson Orin Nano, with the base, arm and every sensor talking ROS 2.",
      status: "active",
      deliverables: [
         "Jetson Orin Nano installed in place of the Raspberry Pi 5, flashed with JetPack and ROS 2 Humble",
         "Base and arm driven through the RRC Lite controller: wheel odometry, IMU, servo joint states",
         "Depth camera and TOF LiDAR publishing on ROS 2 topics",
         "URDF and TF tree for chassis, arm, camera and LiDAR",
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
      title: "LiDAR mapping and navigation",
      description:
         "A LiDAR map of the room, localisation in it, and goal navigation on the mecanum base.",
      status: "planned",
      deliverables: [
         "SLAM Toolbox map of the test area",
         "AMCL localisation against the saved map",
         "Nav2 goal navigation with obstacle avoidance",
      ],
      metrics: ["nav-goal-error"],
   },
   {
      number: 4,
      title: "Camera–LiDAR object fusion",
      description:
         "Detections combined with depth and LiDAR to place each object in 3D on the map, tracked over time.",
      status: "planned",
      deliverables: [
         "Camera–LiDAR extrinsic calibration",
         "3D object positions from detections + depth, cross-checked with LiDAR",
         "Object tracker publishing positions in the map frame",
      ],
      metrics: ["object-position-error"],
   },
   {
      number: 5,
      title: "Hand–eye calibration and grasping",
      description:
         "Wrist camera calibrated to the arm, and grasps planned with MoveIt 2 from fused 3D positions.",
      status: "planned",
      deliverables: [
         "Hand–eye calibration procedure and result",
         "MoveIt 2 planning scene for the arm on the mobile base",
         "Grasp pose generation from fused object positions",
      ],
      metrics: ["calibration-error"],
   },
   {
      number: 6,
      title: "End-to-end fetch demo",
      description:
         "Find an object, drive to it, pick it up and deliver it — evaluated over 50 trials and recorded.",
      status: "planned",
      deliverables: [
         "Find–navigate–grasp–deliver pipeline from one launch file",
         "50-trial evaluation",
         "Demo video and write-up",
      ],
      metrics: ["task-success"],
   },
   {
      number: 7,
      title: "Voice and LLM commands",
      description:
         "Spoken requests turned into robot tasks by a language model, grounded in what the robot can actually see.",
      status: "planned",
      deliverables: [
         "WonderEcho Pro wake word, speech recognition and speech replies on ROS 2",
         "LLM task parser: request → target object + action, checked against current detections",
         "Safe refusals and clarifying questions when a request is ambiguous or impossible",
      ],
      metrics: ["voice-command-success"],
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
      id: "nav-goal-error",
      label: "Navigation goal error",
      unit: "cm",
      baselineLabel: "Wheel odometry only",
      baseline: "measuring",
      optimisedLabel: "LiDAR SLAM + AMCL",
      optimised: "measuring",
      milestone: 3,
      higherIsBetter: false,
      precision: 1,
   },
   {
      id: "object-position-error",
      label: "3D object position error",
      unit: "cm",
      baselineLabel: "Depth camera only",
      baseline: "measuring",
      optimisedLabel: "Camera + LiDAR",
      optimised: "measuring",
      milestone: 4,
      higherIsBetter: false,
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
      id: "task-success",
      label: "Fetch success (50 trials)",
      unit: "%",
      baselineLabel: "Depth camera only",
      baseline: "measuring",
      optimisedLabel: "Camera + LiDAR",
      optimised: "measuring",
      milestone: 6,
      higherIsBetter: true,
      precision: 0,
   },
   {
      id: "voice-command-success",
      label: "Voice command success",
      unit: "%",
      baselineLabel: "Keyword rules",
      baseline: "measuring",
      optimisedLabel: "LLM task parser",
      optimised: "measuring",
      milestone: 7,
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
         "This is my body. A Jetson Orin Nano brain on four mecanum wheels, an arm with a depth camera on the wrist, and a LiDAR. The LiDAR maps the room. The camera finds things. Together they let me drive over and pick them up. Soon you'll be able to just ask.",
      highlight: "architecture",
   },
   {
      sectionId: "build-log",
      title: "Build log",
      narration: `I'm being built in ${milestones.length} milestones, out in the open. Milestone 1 — moving me from a Raspberry Pi to a Jetson — is in progress right now.`,
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
      narration: `${profile.name} ran hotels in Sydney before building robots — and took a venue from the top 20–30 to the top 10. Uptime, incidents, data, teams — it all transfers. Plus a Master of Data Science.`,
   },
   {
      sectionId: "contact",
      title: "Say hello",
      narration:
         "That's the tour. Want to talk robots, AI, web or operations? Send a message. I'll make sure it gets through.",
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
