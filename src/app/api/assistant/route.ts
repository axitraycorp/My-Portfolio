import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/assistant/prompt";
import { assistantTools } from "@/lib/assistant/tools";
import { parseToolCall } from "@/lib/assistant/tool-schemas";
import { parseAssistantRequest, trimHistory } from "@/lib/assistant/validation";
import { TokenBucketLimiter, clientIp } from "@/lib/assistant/rate-limit";
import type { ErrorBody, StreamEvent } from "@/lib/assistant/protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MODEL = "claude-haiku-5-5";
const MAX_OUTPUT_TOKENS = 400;

// Burst of 8 messages, then one every 6 s per IP (≈10/minute sustained)
const limiter = new TokenBucketLimiter(8, 1 / 6);

function json(body: ErrorBody, status: number, headers: Record<string, string> = {}) {
   return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export async function POST(req: Request) {
   const { allowed, retryAfter } = limiter.take(clientIp(req.headers));
   if (!allowed) {
      return json({ error: "rate_limited" }, 429, { "Retry-After": String(retryAfter) });
   }

   const body = await req.json().catch(() => null);
   const parsed = parseAssistantRequest(body);
   if (!parsed.ok) {
      return json({ error: "invalid_request", message: parsed.error }, 400);
   }

   // No key configured: the UI falls back to the scripted tour
   if (!process.env.ANTHROPIC_API_KEY) {
      return json({ error: "unavailable" }, 503);
   }

   const messages: Anthropic.MessageParam[] = trimHistory(parsed.data.messages);
   const client = new Anthropic();
   const stream = client.messages.stream({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      // Short chat replies: no thinking, so the 400-token cap goes to the answer
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      // Tools and system prompt are deterministic, so this prefix is cacheable
      system: [{ type: "text", text: buildSystemPrompt(), cache_control: { type: "ephemeral" } }],
      tools: assistantTools,
      messages,
   });
   req.signal.addEventListener("abort", () => stream.abort());

   const encoder = new TextEncoder();
   const body$ = new ReadableStream<Uint8Array>({
      async start(controller) {
         const send = (event: StreamEvent) =>
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
         try {
            for await (const event of stream) {
               if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                  send({ type: "text", text: event.delta.text });
               }
            }
            const message = await stream.finalMessage();

            if (message.stop_reason === "refusal") {
               send({ type: "error", reason: "refused" });
            } else if (message.stop_reason !== "max_tokens") {
               // A tool input cut off at max_tokens may parse as a partial object; never run those
               for (const block of message.content) {
                  if (block.type !== "tool_use") continue;
                  const call = parseToolCall(block.name, block.input);
                  if (call) send({ type: "tool", call });
               }
            }
            send({ type: "done" });
         } catch (err) {
            if (!req.signal.aborted) {
               if (err instanceof Anthropic.RateLimitError)
                  console.warn("assistant: upstream rate limited");
               else if (err instanceof Anthropic.APIError)
                  console.error(`assistant: API error ${err.status}`, err.message);
               else console.error("assistant: stream failed", err);
               send({ type: "error", reason: "upstream" });
            }
         } finally {
            controller.close();
         }
      },
      cancel() {
         stream.abort();
      },
   });

   return new Response(body$, {
      headers: {
         "Content-Type": "application/x-ndjson; charset=utf-8",
         "Cache-Control": "no-store",
         "X-Accel-Buffering": "no",
      },
   });
}
