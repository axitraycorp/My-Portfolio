import { z } from "zod";
import { ARCHETYPES } from "./archetypes";
import { getPart } from "./catalog";
import type { ArchetypeId, Build } from "./types";

export const MAX_PARTS = 80;
export const MAX_WIRES = 300;
export const MAX_NAME = 60;

const id = z.string().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/);
const portRef = z.object({ uid: id, port: z.string().min(1).max(40).regex(/^[A-Za-z0-9_.-]+$/) });
const archetypeIds = ARCHETYPES.map((a) => a.id) as [ArchetypeId, ...ArchetypeId[]];

export const buildSchema = z
   .object({
      name: z.string().trim().min(1, "Name the build").max(MAX_NAME),
      archetype: z.enum(archetypeIds),
      parts: z
         .array(
            z.object({
               uid: id,
               partId: z.string().max(60).refine((p) => Boolean(getPart(p)), "Unknown part"),
               count: z.number().int().min(1).max(24),
               label: z.string().max(40).optional(),
               i2cAddress: z.number().int().min(0x03).max(0x77).optional(),
            }),
         )
         .max(MAX_PARTS, `At most ${MAX_PARTS} parts`),
      wires: z
         .array(z.object({ id, from: portRef, to: portRef }))
         .max(MAX_WIRES, `At most ${MAX_WIRES} wires`),
   })
   .refine((b) => new Set(b.parts.map((p) => p.uid)).size === b.parts.length, "Part ids must be unique")
   .refine((b) => new Set(b.wires.map((w) => w.id)).size === b.wires.length, "Wire ids must be unique");

export function parseBuild(input: unknown): { ok: true; data: Build } | { ok: false; error: string } {
   const result = buildSchema.safeParse(input);
   if (result.success) return { ok: true, data: result.data as Build };
   return { ok: false, error: result.error.issues[0]?.message ?? "Invalid build" };
}
