// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StreamEvent } from "@/lib/assistant/protocol";

// ── Mock the Anthropic SDK ───────────────────────────────────────────────────
const streamMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
   class APIError extends Error {
      status = 500;
   }
   class RateLimitError extends APIError {
      status = 429;
   }
   class Anthropic {
      static APIError = APIError;
      static RateLimitError = RateLimitError;
      messages = { stream: streamMock };
   }
   return { default: Anthropic };
});

type FakeMessage = { stop_reason: string; content: Array<{ type: string; [k: string]: unknown }> };

function fakeStream(texts: string[], final: FakeMessage, error?: Error) {
   return {
      async *[Symbol.asyncIterator]() {
         for (const text of texts)
            yield { type: "content_block_delta", index: 0, delta: { type: "text_delta", text } };
         if (error) throw error;
      },
      finalMessage: async () => final,
      abort: vi.fn(),
   };
}

let ipCounter = 0;
function request(body: unknown, ip = `10.0.0.${++ipCounter}`) {
   return new Request("http://localhost/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
   });
}

async function events(res: Response): Promise<StreamEvent[]> {
   const text = await res.text();
   return text
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as StreamEvent);
}

const hello = { messages: [{ role: "user", content: "What's special about the robot?" }] };

describe("POST /api/assistant", () => {
   let POST: (req: Request) => Promise<Response>;

   beforeEach(async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
      vi.stubEnv("ANTHROPIC_MODEL", "");
      streamMock.mockReset();
      ({ POST } = await import("../route"));
   });

   afterEach(() => {
      vi.unstubAllEnvs();
   });

   it("rejects messages over 1000 characters without calling the model", async () => {
      const res = await POST(request({ messages: [{ role: "user", content: "x".repeat(1001) }] }));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: "invalid_request" });
      expect(streamMock).not.toHaveBeenCalled();
   });

   it("returns 503 when no API key is configured (scripted tour fallback)", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", "");
      const res = await POST(request(hello));
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: "unavailable" });
   });

   it("streams text, then validated tool calls, then done", async () => {
      streamMock.mockReturnValue(
         fakeStream(["Sensors ", "up. "], {
            stop_reason: "tool_use",
            content: [
               { type: "text", text: "Sensors up. " },
               {
                  type: "tool_use",
                  id: "t1",
                  name: "scroll_to_section",
                  input: { sectionId: "robot" },
               },
               {
                  type: "tool_use",
                  id: "t2",
                  name: "suggest_questions",
                  input: { questions: ["What is fusion?"] },
               },
            ],
         })
      );

      const res = await POST(request(hello));
      expect(res.headers.get("content-type")).toContain("application/x-ndjson");
      expect(await events(res)).toEqual([
         { type: "text", text: "Sensors " },
         { type: "text", text: "up. " },
         { type: "tool", call: { name: "scroll_to_section", input: { sectionId: "robot" } } },
         {
            type: "tool",
            call: { name: "suggest_questions", input: { questions: ["What is fusion?"] } },
         },
         { type: "done" },
      ]);
   });

   it("calls the model with the default model, 400 max tokens, the system prompt and tools", async () => {
      streamMock.mockReturnValue(fakeStream(["ok"], { stop_reason: "end_turn", content: [] }));
      await events(await POST(request(hello)));

      const params = streamMock.mock.calls[0][0];
      expect(params.model).toBe("claude-haiku-5-5");
      expect(params.max_tokens).toBe(400);
      expect(params.system[0].text).toContain("You are Unit-7");
      expect(params.tools.map((t: { name: string }) => t.name)).toEqual([
         "scroll_to_section",
         "highlight_element",
         "open_project",
         "show_metric",
         "suggest_questions",
      ]);
   });

   it("uses ANTHROPIC_MODEL when set", async () => {
      vi.stubEnv("ANTHROPIC_MODEL", "claude-sonnet-5-5");
      streamMock.mockReturnValue(fakeStream(["ok"], { stop_reason: "end_turn", content: [] }));
      await events(await POST(request(hello)));
      expect(streamMock.mock.calls[0][0].model).toBe("claude-sonnet-5-5");
   });

   it("sends only the last 12 messages, starting with the visitor", async () => {
      streamMock.mockReturnValue(fakeStream(["ok"], { stop_reason: "end_turn", content: [] }));
      const messages = Array.from({ length: 25 }, (_, i) => ({
         role: i % 2 === 0 ? "user" : "assistant",
         content: `message ${i}`,
      }));
      await events(await POST(request({ messages })));
      const sent = streamMock.mock.calls[0][0].messages;
      expect(sent.length).toBeLessThanOrEqual(12);
      expect(sent[0].role).toBe("user");
      expect(sent.at(-1).content).toBe("message 24");
   });

   it("drops unknown tools and invalid tool inputs", async () => {
      streamMock.mockReturnValue(
         fakeStream([], {
            stop_reason: "tool_use",
            content: [
               { type: "tool_use", id: "t1", name: "open_project", input: { slug: "../../admin" } },
               { type: "tool_use", id: "t2", name: "run_shell", input: { cmd: "rm -rf /" } },
            ],
         })
      );
      expect(await events(await POST(request(hello)))).toEqual([{ type: "done" }]);
   });

   it("does not run tool calls cut off by max_tokens", async () => {
      streamMock.mockReturnValue(
         fakeStream(["Long answer"], {
            stop_reason: "max_tokens",
            content: [
               {
                  type: "tool_use",
                  id: "t1",
                  name: "scroll_to_section",
                  input: { sectionId: "robot" },
               },
            ],
         })
      );
      expect(await events(await POST(request(hello)))).toEqual([
         { type: "text", text: "Long answer" },
         { type: "done" },
      ]);
   });

   it("reports refusals as an error event", async () => {
      streamMock.mockReturnValue(fakeStream([], { stop_reason: "refusal", content: [] }));
      expect(await events(await POST(request(hello)))).toEqual([
         { type: "error", reason: "refused" },
         { type: "done" },
      ]);
   });

   it("emits an error event when the upstream stream fails", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      streamMock.mockReturnValue(
         fakeStream(["Hel"], { stop_reason: "end_turn", content: [] }, new Error("socket hang up"))
      );
      expect(await events(await POST(request(hello)))).toEqual([
         { type: "text", text: "Hel" },
         { type: "error", reason: "upstream" },
      ]);
   });

   it("rate limits a single IP after its burst", async () => {
      streamMock.mockImplementation(() =>
         fakeStream(["ok"], { stop_reason: "end_turn", content: [] })
      );
      const statuses: number[] = [];
      for (let i = 0; i < 10; i++) {
         const res = await POST(request(hello, "203.0.113.7"));
         statuses.push(res.status);
         await res.text();
      }
      expect(statuses.slice(0, 8).every((s) => s === 200)).toBe(true);
      expect(statuses.at(-1)).toBe(429);
   });
});
