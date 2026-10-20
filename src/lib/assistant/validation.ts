import { z } from "zod";

export const MAX_USER_MESSAGE_CHARS = 1000;
/** Assistant replies are capped at 400 output tokens, so they never get near this. */
export const MAX_ASSISTANT_MESSAGE_CHARS = 4000;
export const MAX_HISTORY = 12;

const userMessage = z.object({
   role: z.literal("user"),
   content: z
      .string()
      .trim()
      .min(1, "Message is empty")
      .max(MAX_USER_MESSAGE_CHARS, `Messages are limited to ${MAX_USER_MESSAGE_CHARS} characters`),
});

const assistantMessage = z.object({
   role: z.literal("assistant"),
   content: z.string().max(MAX_ASSISTANT_MESSAGE_CHARS),
});

export const assistantRequestSchema = z.object({
   messages: z
      .array(z.discriminatedUnion("role", [userMessage, assistantMessage]))
      .min(1, "No messages")
      // Generous outer bound; the route only forwards the last MAX_HISTORY
      .max(100, "Too many messages")
      .refine(
         (msgs) => msgs[msgs.length - 1]?.role === "user",
         "The last message must be from the visitor"
      ),
});

export type ChatMessage = z.infer<typeof userMessage> | z.infer<typeof assistantMessage>;
export type AssistantRequest = z.infer<typeof assistantRequestSchema>;

export type ParseResult = { ok: true; data: AssistantRequest } | { ok: false; error: string };

export function parseAssistantRequest(body: unknown): ParseResult {
   const result = assistantRequestSchema.safeParse(body);
   if (result.success) return { ok: true, data: result.data };
   return { ok: false, error: result.error.issues[0]?.message ?? "Invalid request" };
}

/**
 * Keeps the last `limit` messages and drops leading assistant messages so the
 * conversation sent to the model always starts with the visitor. Empty
 * assistant turns (e.g. a reply that was only tool calls) are removed.
 */
export function trimHistory(messages: ChatMessage[], limit = MAX_HISTORY): ChatMessage[] {
   const recent = messages.filter((m) => m.content.trim().length > 0).slice(-limit);
   const firstUser = recent.findIndex((m) => m.role === "user");
   return firstUser === -1 ? [] : recent.slice(firstUser);
}
