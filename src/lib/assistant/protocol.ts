import type { ToolCall } from "./tool-schemas";

/** One line of the /api/assistant NDJSON stream. */
export type StreamEvent =
   | { type: "text"; text: string }
   | { type: "tool"; call: ToolCall }
   | { type: "done" }
   | { type: "error"; reason: "upstream" | "refused" };

/** Error body for non-streaming failures (HTTP 4xx/5xx). */
export type ErrorBody = {
   error: "invalid_request" | "rate_limited" | "unavailable";
   message?: string;
};
