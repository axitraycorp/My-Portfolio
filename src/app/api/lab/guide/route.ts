import Anthropic from "@anthropic-ai/sdk";
import { TokenBucketLimiter, clientIp } from "@/lib/assistant/rate-limit";
import { analyse } from "@/lab/engine";
import { buildBrief } from "@/lab/engine/brief";
import { guideRequestSchema, guideToolDefinitions, type GuideEvent } from "@/lab/guide/ai";
import { guideState } from "@/lab/guide/steps";
import { CATEGORY_LABELS, PARTS, getPart } from "@/lab/model/catalog";
import { parseBuild } from "@/lab/model/validation";
import { fail, requireUser } from "@/lab/server/http";
import { consumeAdvisorCredit, refundAdvisorCredit } from "@/lab/server/users";
import { portSummary } from "@/lab/ui/ports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MODEL = "claude-opus-5-5";
const MAX_OUTPUT_TOKENS = 700;
const limiter = new TokenBucketLimiter(6, 1 / 10);

const SYSTEM = `You are Unit-7, the guide in a robotics simulator. You teach beginners to build a robot from scratch: choosing parts, wiring each port correctly, and understanding why. You are friendly, concrete and brief.

You receive: the parts catalogue, the user's build (parts with their exact ports, wires), the simulator's deterministic findings, and the guide's current step. Rules:
- Trust the simulator's numbers; never invent part specs or ports.
- To change the build or show something, call tools: add_part, connect (exact "uid:port" refs from PORTS), open_tab, highlight. Make changes only when the user asks or agrees; otherwise explain and highlight.
- When wiring, connect power first (battery → switch → regulators → boards), then motors, then signals. Only connect compatible ports.
- Answer in plain sentences, under 120 words. No headings.`;

function catalogue(): string {
   return PARTS.map((p) => `${p.id} — ${p.name} (${CATEGORY_LABELS[p.category]})`).join("\n");
}

function portsOf(build: ReturnType<typeof parseBuild> & { ok: true }): string {
   return build.data.parts
      .map((inst) => {
         const part = getPart(inst.partId);
         if (!part || part.ports.length === 0) return null;
         return `[${inst.uid}] ${part.name}: ${part.ports.map((p) => `${inst.uid}:${p.id} (${p.label}; ${portSummary(p)})`).join(" | ")}`;
      })
      .filter(Boolean)
      .join("\n");
}

export async function POST(req: Request) {
   const guard = await requireUser(req, { mutating: true });
   if (guard.error) return guard.error;

   const { allowed, retryAfter } = limiter.take(clientIp(req.headers));
   if (!allowed) return fail(429, "rate_limited", `Wait ${retryAfter} s before asking again.`);

   const body = guideRequestSchema.safeParse(await req.json().catch(() => null));
   if (!body.success) return fail(400, "invalid_request", body.error.issues[0]?.message);
   const build = parseBuild(body.data.build);
   if (!build.ok) return fail(400, "invalid_request", build.error);

   if (!process.env.ANTHROPIC_API_KEY) {
      return fail(503, "unavailable", "Unit-7's AI isn't switched on for this site yet — the guided steps above still walk you through everything.");
   }
   if (!(await consumeAdvisorCredit(guard.user.id))) {
      return fail(403, "quota", `You've used all ${guard.user.advisorCredits} AI questions. Contact the site owner if you need more.`);
   }

   const a = analyse(build.data);
   const step = guideState(build.data, a, { skipped: new Set(), planSeen: false }).current;
   const context = [
      "CATALOGUE:",
      catalogue(),
      "",
      buildBrief(build.data),
      "",
      "PORTS (use these exact refs with connect):",
      portsOf(build) || "(no parts with ports yet)",
      "",
      `GUIDE STEP: ${step.title} — ${step.say}`,
      step.wires.length ? `Suggested next wires: ${step.wires.map((w) => `${w.from.uid}:${w.from.port} → ${w.to.uid}:${w.to.port}`).join(", ")}` : "",
   ].join("\n");

   const messages: Anthropic.MessageParam[] = [
      ...body.data.history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: `${context}\n\nUSER QUESTION: ${body.data.question}` },
   ];

   const client = new Anthropic();
   const stream = client.messages.stream({
      model: process.env.LAB_GUIDE_MODEL || process.env.LAB_ADVISOR_MODEL || DEFAULT_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      tools: guideToolDefinitions(),
      messages,
   });
   req.signal.addEventListener("abort", () => stream.abort());

   const encoder = new TextEncoder();
   const userId = guard.user.id;
   const out = new ReadableStream<Uint8Array>({
      async start(controller) {
         const send = (e: GuideEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
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
            else if (message.stop_reason !== "max_tokens") {
               for (const block of message.content) {
                  if (block.type === "tool_use") {
                     produced = true;
                     send({ type: "tool", name: block.name, input: block.input });
                  }
               }
            }
            send({ type: "done" });
         } catch (err) {
            if (!produced) await refundAdvisorCredit(userId).catch(() => undefined);
            if (!req.signal.aborted) {
               if (err instanceof Anthropic.APIError) console.error(`guide: API error ${err.status}`, err.message);
               else console.error("guide: stream failed", err);
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

   return new Response(out, {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
   });
}
