import Anthropic from "@anthropic-ai/sdk";
import { TokenBucketLimiter, clientIp } from "@/lib/assistant/rate-limit";
import { buildBrief } from "@/lab/engine/brief";
import { parseBuild } from "@/lab/model/validation";
import { fail, requireUser } from "@/lab/server/http";
import { consumeAdvisorCredit, refundAdvisorCredit } from "@/lab/server/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MODEL = "claude-opus-5-5";
const MAX_OUTPUT_TOKENS = 1500;
const limiter = new TokenBucketLimiter(3, 1 / 30);

const SYSTEM = `You are the build advisor in a robotics simulator. A user designed a robot from catalogue parts and wired it up. You receive the parts, the wiring, and the simulator's own deterministic findings (electrical, signal, thermal, mechanical, environment tests).

Write a concise engineering review in Markdown:
1. **Verdict** — one sentence: would this robot work as wired?
2. **Fix first** — the errors that stop it working, each with the concrete change (which part to swap or which wire to move, using the [uid] ids).
3. **Improve** — up to 4 upgrades ranked by impact (power margin, runtime, compute, cooling, torque, sensors) for this robot type.
4. **Real-world notes** — things a simulator cannot see (connector types, wire gauge, EMI from motors, mounting, firmware/ROS 2 setup), only if relevant.

Rules: trust the simulator's numbers; do not invent part specs; only recommend parts by generic description. Keep it under 350 words.`;

export async function POST(req: Request) {
   const guard = await requireUser(req, { mutating: true });
   if (guard.error) return guard.error;

   const { allowed, retryAfter } = limiter.take(clientIp(req.headers));
   if (!allowed) return fail(429, "rate_limited", `Wait ${retryAfter} s before the next review.`);

   const parsed = parseBuild(await req.json().catch(() => null));
   if (!parsed.ok) return fail(400, "invalid_request", parsed.error);

   if (!process.env.ANTHROPIC_API_KEY) {
      return fail(503, "unavailable", "The AI advisor is not switched on for this deployment yet. The simulator checks above still apply.");
   }

   if (!(await consumeAdvisorCredit(guard.user.id))) {
      return fail(
         403,
         "quota",
         `You've used all ${guard.user.advisorCredits} advisor reviews. Contact the site owner if you need more.`,
      );
   }

   const client = new Anthropic();
   const stream = client.messages.stream({
      model: process.env.LAB_ADVISOR_MODEL || DEFAULT_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      thinking: { type: "disabled" },
      output_config: { effort: "medium" },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildBrief(parsed.data) }],
   });
   req.signal.addEventListener("abort", () => stream.abort());

   const encoder = new TextEncoder();
   const userId = guard.user.id;
   const body = new ReadableStream<Uint8Array>({
      async start(controller) {
         const send = (event: { type: "text"; text: string } | { type: "done" } | { type: "error"; reason: string }) =>
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
         let produced = false;
         try {
            for await (const event of stream) {
               if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                  produced = true;
                  send({ type: "text", text: event.delta.text });
               }
            }
            const message = await stream.finalMessage();
            if (message.stop_reason === "refusal") send({ type: "error", reason: "refused" });
            send({ type: "done" });
         } catch (err) {
            if (!produced) await refundAdvisorCredit(userId).catch(() => undefined);
            if (!req.signal.aborted) {
               if (err instanceof Anthropic.APIError) console.error(`advisor: API error ${err.status}`, err.message);
               else console.error("advisor: stream failed", err);
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

   return new Response(body, {
      headers: {
         "Content-Type": "application/x-ndjson; charset=utf-8",
         "Cache-Control": "no-store",
         "X-Accel-Buffering": "no",
      },
   });
}
