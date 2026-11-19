import type { Metadata } from "next";
import { ARCHETYPES } from "@/lab/model/archetypes";
import type { ArchetypeId } from "@/lab/model/types";
import { Workbench } from "@/lab/ui/Workbench";

export const metadata: Metadata = {
   title: "Robot Lab — builder",
   description: "Configure, wire and test a robot in the browser.",
   alternates: { canonical: "/lab" },
   robots: { index: false },
};

type Props = { searchParams: Promise<{ type?: string; id?: string }> };

export default async function BuildPage({ searchParams }: Props) {
   const { type, id } = await searchParams;
   const archetype = (ARCHETYPES.some((a) => a.id === type) ? type : "mecanum-rover") as ArchetypeId;
   const savedId = id && /^[0-9a-f-]{36}$/i.test(id) ? id : undefined;
   // Keyed so switching type or build remounts with fresh state
   return <Workbench key={savedId ?? archetype} archetype={archetype} savedId={savedId} />;
}
