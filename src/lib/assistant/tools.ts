import type Anthropic from "@anthropic-ai/sdk";
import { HIGHLIGHT_IDS, METRIC_IDS, PROJECT_SLUGS, SECTION_IDS } from "./tool-schemas";

/**
 * Tool definitions sent to Claude. The browser executes them; the route never
 * returns tool results to the model (they are page side effects only).
 * `strict` keeps inputs schema-valid; `eager_input_streaming` avoids buffering.
 * Inputs are still validated with zod before they reach the page.
 */
export const assistantTools: Anthropic.Tool[] = [
   {
      name: "scroll_to_section",
      description: "Smoothly scroll the visitor's page to a section of the portfolio.",
      strict: true,
      eager_input_streaming: true,
      input_schema: {
         type: "object",
         properties: { sectionId: { type: "string", enum: [...SECTION_IDS] } },
         required: ["sectionId"],
         additionalProperties: false,
      },
   },
   {
      name: "highlight_element",
      description:
         "Draw a detection-style bounding box with a short label around one element on the page and dim the rest. Use to point at something specific you are talking about.",
      strict: true,
      eager_input_streaming: true,
      input_schema: {
         type: "object",
         properties: {
            elementId: { type: "string", enum: [...HIGHLIGHT_IDS] },
            label: {
               type: "string",
               description:
                  "Short label shown on the box, e.g. 'fusion pipeline'. Max 40 characters.",
            },
         },
         required: ["elementId", "label"],
         additionalProperties: false,
      },
   },
   {
      name: "open_project",
      description: "Navigate to a project's detail page.",
      strict: true,
      eager_input_streaming: true,
      input_schema: {
         type: "object",
         properties: { slug: { type: "string", enum: [...PROJECT_SLUGS] } },
         required: ["slug"],
         additionalProperties: false,
      },
   },
   {
      name: "show_metric",
      description: "Scroll to the results table and pulse one metric's row.",
      strict: true,
      eager_input_streaming: true,
      input_schema: {
         type: "object",
         properties: { metricId: { type: "string", enum: [...METRIC_IDS] } },
         required: ["metricId"],
         additionalProperties: false,
      },
   },
   {
      name: "suggest_questions",
      description: "Offer the visitor 1–3 short follow-up questions as clickable chips.",
      strict: true,
      eager_input_streaming: true,
      input_schema: {
         type: "object",
         properties: {
            questions: {
               type: "array",
               items: { type: "string" },
               description: "1–3 questions, each under 90 characters.",
            },
         },
         required: ["questions"],
         additionalProperties: false,
      },
   },
];
