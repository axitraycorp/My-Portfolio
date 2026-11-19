import { z } from "zod";
import { PARTS, getPart } from "../model/catalog";
import type { Build } from "../model/types";
import type { GuideTab } from "./steps";

/* Tools the AI guide can call. They run in the browser, after validation against the current build. */

export const GUIDE_TABS = ["issues", "parts", "wiring", "plan", "power"] as const satisfies readonly GuideTab[];

const ref = z.string().regex(/^[A-Za-z0-9_-]+:[A-Za-z0-9_.-]+$/);

export const guideToolSchemas = {
   add_part: z.object({ part_id: z.string(), count: z.number().int().min(1).max(24).default(1) }),
   connect: z.object({ from: ref, to: ref }),
   open_tab: z.object({ tab: z.enum(GUIDE_TABS) }),
   highlight: z.object({ uids: z.array(z.string().max(40)).max(10) }),
};

export type GuideToolCall =
   | { name: "add_part"; input: z.infer<typeof guideToolSchemas.add_part> }
   | { name: "connect"; input: z.infer<typeof guideToolSchemas.connect> }
   | { name: "open_tab"; input: z.infer<typeof guideToolSchemas.open_tab> }
   | { name: "highlight"; input: z.infer<typeof guideToolSchemas.highlight> };

/** Parses a tool call and checks it against the build: real parts, real ports. */
export function parseGuideTool(name: string, input: unknown, build: Build): GuideToolCall | null {
   if (!(name in guideToolSchemas)) return null;
   const parsed = guideToolSchemas[name as keyof typeof guideToolSchemas].safeParse(input);
   if (!parsed.success) return null;
   const call = { name, input: parsed.data } as GuideToolCall;
   if (call.name === "add_part" && !getPart(call.input.part_id)) return null;
   if (call.name === "connect") {
      for (const r of [call.input.from, call.input.to]) {
         const [uid, port] = r.split(":");
         const inst = build.parts.find((p) => p.uid === uid);
         if (!inst || !getPart(inst.partId)?.ports.some((p) => p.id === port)) return null;
      }
   }
   if (call.name === "highlight") call.input.uids = call.input.uids.filter((u) => build.parts.some((p) => p.uid === u));
   return call;
}

/** Tool definitions for the Messages API. */
export function guideToolDefinitions() {
   return [
      {
         name: "add_part",
         description: "Add a catalogue part to the user's build. Only when the user asks for it or agrees.",
         input_schema: {
            type: "object" as const,
            properties: {
               part_id: { type: "string", enum: PARTS.map((p) => p.id), description: "Catalogue part id" },
               count: { type: "integer", minimum: 1, maximum: 24, description: "How many identical units" },
            },
            required: ["part_id"],
         },
      },
      {
         name: "connect",
         description:
            "Connect two ports with a wire. Use exact 'uid:port' references from the build description (e.g. 'bat:out' to 'sw:in'). Only connect compatible ports; never connect a power output to a signal pin.",
         input_schema: {
            type: "object" as const,
            properties: { from: { type: "string" }, to: { type: "string" } },
            required: ["from", "to"],
         },
      },
      {
         name: "open_tab",
         description: "Show a panel: issues (checks), parts, wiring, plan (assembly plan in 3D), power (power and stats).",
         input_schema: { type: "object" as const, properties: { tab: { type: "string", enum: [...GUIDE_TABS] } }, required: ["tab"] },
      },
      {
         name: "highlight",
         description: "Make parts glow in the 3D view so the user can see which ones you mean. Use part uids from the build.",
         input_schema: {
            type: "object" as const,
            properties: { uids: { type: "array", items: { type: "string" }, maxItems: 10 } },
            required: ["uids"],
         },
      },
   ];
}

export const guideRequestSchema = z.object({
   question: z.string().trim().min(1, "Ask a question").max(500, "Keep questions under 500 characters"),
   history: z
      .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
      .max(8)
      .default([]),
   build: z.unknown(),
});

export type GuideEvent =
   | { type: "text"; text: string }
   | { type: "tool"; name: string; input: unknown }
   | { type: "done" }
   | { type: "error"; reason: string };
