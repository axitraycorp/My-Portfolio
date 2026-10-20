import { z } from "zod";
import { metrics, projects, sections } from "@/content/profile";

/*
 * Tool input schemas, shared by the API route (validates before streaming a
 * tool call) and the browser (validates again before running it). No SDK
 * imports here so it is safe to bundle client-side.
 */

const sectionIds = sections.map((s) => s.id) as [string, ...string[]];
const projectSlugs = projects.map((p) => p.slug) as [string, ...string[]];
const metricIds = metrics.map((m) => m.id) as [string, ...string[]];

/** Element ids the assistant may draw a bounding box around. */
export const HIGHLIGHT_IDS = [
   "architecture",
   "specs",
   "timeline",
   ...[1, 2, 3, 4, 5, 6].map((n) => `milestone-${n}`),
   "metrics-table",
   ...metrics.map((m) => `metric-${m.id}`),
   ...projects.filter((p) => !p.flagship).map((p) => `project-${p.slug}`),
   "skills-transfer",
   "contact-email",
] as [string, ...string[]];

export const toolInputSchemas = {
   scroll_to_section: z.object({ sectionId: z.enum(sectionIds) }).strict(),
   highlight_element: z
      .object({
         elementId: z.enum(HIGHLIGHT_IDS),
         label: z.string().min(1).max(40),
      })
      .strict(),
   open_project: z.object({ slug: z.enum(projectSlugs) }).strict(),
   show_metric: z.object({ metricId: z.enum(metricIds) }).strict(),
   suggest_questions: z
      .object({ questions: z.array(z.string().min(3).max(90)).min(1).max(3) })
      .strict(),
};

export type ToolName = keyof typeof toolInputSchemas;

export type ToolCall = {
   [K in ToolName]: { name: K; input: z.infer<(typeof toolInputSchemas)[K]> };
}[ToolName];

export function isToolName(name: string): name is ToolName {
   return Object.prototype.hasOwnProperty.call(toolInputSchemas, name);
}

/** Returns a typed tool call, or null if the name is unknown or the input is invalid. */
export function parseToolCall(name: string, input: unknown): ToolCall | null {
   if (!isToolName(name)) return null;
   const result = toolInputSchemas[name].safeParse(input);
   return result.success ? ({ name, input: result.data } as ToolCall) : null;
}

export const SECTION_IDS = sectionIds;
export const PROJECT_SLUGS = projectSlugs;
export const METRIC_IDS = metricIds;
