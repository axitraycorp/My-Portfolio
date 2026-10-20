import { z } from "zod";

/*
 * Tool input schemas. Client-safe: no content or SDK imports, so profile.ts
 * (and its TODO placeholders) never ends up in the browser bundle.
 *
 * The server builds strict schemas from the real ids in profile.ts
 * (see tool-ids.ts). The browser uses the structural schemas below as a second
 * check on events from our own route, which has already enforced the ids.
 */

type Ids = [string, ...string[]];

export type ToolIds = {
   sections: Ids;
   highlights: Ids;
   projects: Ids;
   metrics: Ids;
};

const id = (allowed?: Ids) => (allowed ? z.enum(allowed) : z.string().min(1).max(80));

export function makeToolSchemas(ids?: ToolIds) {
   return {
      scroll_to_section: z.object({ sectionId: id(ids?.sections) }).strict(),
      highlight_element: z
         .object({
            elementId: id(ids?.highlights),
            label: z.string().min(1).max(40),
         })
         .strict(),
      open_project: z.object({ slug: id(ids?.projects) }).strict(),
      show_metric: z.object({ metricId: id(ids?.metrics) }).strict(),
      suggest_questions: z
         .object({ questions: z.array(z.string().min(3).max(90)).min(1).max(3) })
         .strict(),
   };
}

type Schemas = ReturnType<typeof makeToolSchemas>;

export type ToolName = keyof Schemas;

export type ToolCall = {
   [K in ToolName]: { name: K; input: z.infer<Schemas[K]> };
}[ToolName];

export function isToolName(name: string): name is ToolName {
   return [
      "scroll_to_section",
      "highlight_element",
      "open_project",
      "show_metric",
      "suggest_questions",
   ].includes(name);
}

/** Returns a typed tool call, or null if the name is unknown or the input is invalid. */
export function parseToolCallWith(schemas: Schemas, name: string, input: unknown): ToolCall | null {
   if (!isToolName(name)) return null;
   const result = schemas[name].safeParse(input);
   return result.success ? ({ name, input: result.data } as ToolCall) : null;
}

const structural = makeToolSchemas();

/** Browser-side check (structure only). */
export function parseToolCallClient(name: string, input: unknown): ToolCall | null {
   return parseToolCallWith(structural, name, input);
}
