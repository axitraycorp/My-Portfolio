import { metrics, milestones, projects, sections } from "@/content/profile";
import { makeToolSchemas, parseToolCallWith, type ToolCall } from "./tool-schemas";

/* Server-side: the ids the assistant's tools may target, derived from profile.ts. */

export const SECTION_IDS = sections.map((s) => s.id) as [string, ...string[]];
export const PROJECT_SLUGS = projects.map((p) => p.slug) as [string, ...string[]];
export const METRIC_IDS = metrics.map((m) => m.id) as [string, ...string[]];

/** Element ids the assistant may draw a bounding box around. */
export const HIGHLIGHT_IDS = [
   "at-a-glance",
   "architecture",
   "specs",
   "timeline",
   ...milestones.map((m) => `milestone-${m.number}`),
   "metrics-table",
   ...metrics.map((m) => `metric-${m.id}`),
   ...projects.filter((p) => !p.flagship).map((p) => `project-${p.slug}`),
   "skills-transfer",
   "contact-email",
] as [string, ...string[]];

const strict = makeToolSchemas({
   sections: SECTION_IDS,
   highlights: HIGHLIGHT_IDS,
   projects: PROJECT_SLUGS,
   metrics: METRIC_IDS,
});

/** Strict check used by the API route before a tool call reaches the browser. */
export function parseToolCall(name: string, input: unknown): ToolCall | null {
   return parseToolCallWith(strict, name, input);
}
