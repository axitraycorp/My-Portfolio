"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { analyse } from "../engine";
import { ENVIRONMENTS, runEnvironment } from "../engine/environments";
import { getArchetype, templateFor } from "../model/archetypes";
import { getPart } from "../model/catalog";
import type { ArchetypeId, Build, Issue, PartInstance } from "../model/types";
import { parseBuild } from "../model/validation";
import { AdvisorPanel } from "./AdvisorPanel";
import { IssuesPanel } from "./IssuesPanel";
import { PartsPanel } from "./PartsPanel";
import { PowerPanel } from "./PowerPanel";
import { SceneView } from "./SceneView";
import { TestsPanel } from "./TestsPanel";
import { WiringPanel } from "./WiringPanel";
import { nextId, parseRef } from "./ports";
import { postJson, useLabUser } from "./useLabUser";

type Tab = "issues" | "parts" | "wiring" | "power" | "advisor";
const TABS: { id: Tab; label: string }[] = [
   { id: "issues", label: "Checks" },
   { id: "parts", label: "Parts" },
   { id: "wiring", label: "Wiring" },
   { id: "power", label: "Power & stats" },
   { id: "advisor", label: "AI advisor" },
];

type Props = { archetype: ArchetypeId; savedId?: string };

export function Workbench({ archetype, savedId: initialId }: Props) {
   const [build, setBuild] = useState<Build>(() => templateFor(archetype));
   const [savedId, setSavedId] = useState<string | null>(initialId ?? null);
   const [loadState, setLoadState] = useState<"ready" | "loading" | "missing">(initialId ? "loading" : "ready");
   const [dirty, setDirty] = useState(false);
   const [tab, setTab] = useState<Tab>("issues");
   const [envId, setEnvId] = useState("bench");
   const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
   const [saveMsg, setSaveMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
   const [saving, setSaving] = useState(false);
   const account = useLabUser();
   const fileInput = useRef<HTMLInputElement>(null);
   const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

   useEffect(() => {
      if (!initialId) return;
      void (async () => {
         const res = await fetch(`/api/lab/builds/${initialId}`, { cache: "no-store" });
         if (!res.ok) return setLoadState("missing");
         const body = (await res.json()) as { build: { build: Build } };
         const parsed = parseBuild(body.build.build);
         if (!parsed.ok) return setLoadState("missing");
         setBuild(parsed.data);
         setLoadState("ready");
      })();
   }, [initialId]);

   const analysis = useMemo(() => analyse(build), [build]);
   const results = useMemo(() => ENVIRONMENTS.map((e) => runEnvironment(analysis, e)), [analysis]);
   const { report } = analysis;
   const arche = getArchetype(build.archetype);
   const env = ENVIRONMENTS.find((e) => e.id === envId) ?? ENVIRONMENTS[0];
   const envResult = results.find((r) => r.environmentId === env.id)!;
   const highlight = useMemo(() => new Set(activeIssue?.uids ?? []), [activeIssue]);

   const sceneRobot = useMemo(() => {
      const parts = build.parts.map((p) => getPart(p.partId)).filter((p) => p !== undefined);
      return {
         archetype: build.archetype,
         lidar: parts.some((p) => p.sensor?.type === "lidar"),
         camera: parts.some((p) => p.sensor?.type === "camera" || p.sensor?.type === "depth-camera"),
         fan: parts.some((p) => p.category === "cooling" && /fan|active|cooler/i.test(`${p.id} ${p.name}`)),
         computer: parts.some((p) => p.category === "compute"),
      };
   }, [build]);

   const update = useCallback((fn: (b: Build) => Build) => {
      setBuild((b) => fn(b));
      setDirty(true);
      setSaveMsg(null);
   }, []);

   const addPart = (partId: string) =>
      update((b) => ({ ...b, parts: [...b.parts, { uid: nextId("p", b.parts.map((p) => p.uid)), partId, count: 1 }] }));
   const removePart = (uid: string) => {
      update((b) => ({
         ...b,
         parts: b.parts.filter((p) => p.uid !== uid),
         wires: b.wires.filter((w) => w.from.uid !== uid && w.to.uid !== uid),
      }));
      setActiveIssue(null);
   };
   const changePart = (uid: string, patch: Partial<PartInstance>) =>
      update((b) => ({ ...b, parts: b.parts.map((p) => (p.uid === uid ? { ...p, ...patch } : p)) }));
   const addWire = (from: string, to: string) =>
      update((b) => {
         const a = parseRef(from);
         const z = parseRef(to);
         const dup = b.wires.some(
            (w) =>
               (w.from.uid === a.uid && w.from.port === a.port && w.to.uid === z.uid && w.to.port === z.port) ||
               (w.to.uid === a.uid && w.to.port === a.port && w.from.uid === z.uid && w.from.port === z.port),
         );
         if (dup) return b;
         return { ...b, wires: [...b.wires, { id: nextId("w", b.wires.map((w) => w.id)), from: a, to: z }] };
      });
   const removeWire = (id: string) => update((b) => ({ ...b, wires: b.wires.filter((w) => w.id !== id) }));

   const reset = () => {
      if (dirty && !window.confirm("Replace this build with the starter configuration? Unsaved changes are lost.")) return;
      setBuild({ ...templateFor(build.archetype), name: build.name });
      setDirty(true);
      setActiveIssue(null);
   };

   async function save(asNew = false) {
      setSaving(true);
      setSaveMsg(null);
      const res =
         savedId && !asNew
            ? await postJson<{ build: { id: string } }>(`/api/lab/builds/${savedId}`, build, "PUT")
            : await postJson<{ build: { id: string } }>("/api/lab/builds", build);
      setSaving(false);
      if (!res.ok) {
         setSaveMsg({ tone: "error", text: res.data.message ?? "Couldn't save. Try again." });
         return;
      }
      setSavedId(res.data.build.id);
      setDirty(false);
      setSaveMsg({ tone: "ok", text: "Saved." });
      window.history.replaceState(null, "", `/lab/build?id=${res.data.build.id}`);
   }

   function exportJson() {
      const blob = new Blob([JSON.stringify(build, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${build.name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase() || "robot"}.json`;
      a.click();
      URL.revokeObjectURL(url);
   }

   async function importJson(file: File) {
      try {
         const parsed = parseBuild(JSON.parse(await file.text()));
         if (!parsed.ok) throw new Error(parsed.error);
         setBuild(parsed.data);
         setDirty(true);
         setActiveIssue(null);
         setSaveMsg({ tone: "ok", text: `Imported “${parsed.data.name}”.` });
      } catch (err) {
         setSaveMsg({ tone: "error", text: `Import failed: ${err instanceof Error ? err.message : "not a build file"}` });
      }
   }

   const showIssue = (issue: Issue) => {
      setActiveIssue((cur) => (cur?.id === issue.id ? null : issue));
   };

   const onTabKey = (e: React.KeyboardEvent, i: number) => {
      const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!dir && e.key !== "Home" && e.key !== "End") return;
      e.preventDefault();
      const next = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : (i + dir + TABS.length) % TABS.length;
      setTab(TABS[next].id);
      tabRefs.current[next]?.focus();
   };

   if (loadState === "loading") return <p className="px-gutter py-xl text-muted">Loading build…</p>;
   if (loadState === "missing") {
      return (
         <div className="mx-auto max-w-content px-gutter py-xl">
            <p>That build wasn&apos;t found, or it belongs to another account.</p>
            <Link href="/lab" className="link mt-s inline-block">
               Back to the lab
            </Link>
         </div>
      );
   }

   const { counts } = report;

   return (
      <div className="mx-auto flex max-w-content flex-col gap-l px-gutter py-l">
         <header className="flex flex-col gap-s">
            <nav aria-label="Breadcrumb" className="font-mono text-caption text-muted">
               <Link href="/lab" className="hover:text-ink">
                  /lab
               </Link>{" "}
               / {arche?.name ?? build.archetype}
            </nav>
            <div className="flex flex-wrap items-end gap-s">
               <div className="min-w-[14rem] flex-1">
                  <label htmlFor="build-name" className="mono-caps text-muted">
                     Build name
                  </label>
                  <input
                     id="build-name"
                     className="lab-input mt-3xs font-display text-lead"
                     value={build.name}
                     maxLength={60}
                     onChange={(e) => update((b) => ({ ...b, name: e.target.value }))}
                  />
               </div>
               <div className="flex flex-wrap items-center gap-2xs" role="status" aria-label="Check summary">
                  <span className="lab-sev" data-sev={counts.error ? "error" : "ok"}>
                     {counts.error} errors
                  </span>
                  <span className="lab-sev" data-sev={counts.warning ? "warning" : "ok"}>
                     {counts.warning} warnings
                  </span>
                  <span className="lab-sev" data-sev="info">
                     {counts.info} notes
                  </span>
               </div>
            </div>
            <div className="flex flex-wrap items-center gap-2xs">
               {account.user ? (
                  <>
                     <button type="button" className="btn btn-primary" onClick={() => save()} disabled={saving || !build.name.trim()}>
                        {saving ? "Saving…" : savedId ? (dirty ? "Save changes" : "Saved") : "Save build"}
                     </button>
                     {savedId && (
                        <button type="button" className="btn btn-ghost" onClick={() => save(true)} disabled={saving}>
                           Save as new
                        </button>
                     )}
                  </>
               ) : (
                  !account.loading && (
                     <Link href="/lab/login" className="btn btn-ghost">
                        Sign in to save
                     </Link>
                  )
               )}
               <button type="button" className="btn btn-ghost" onClick={exportJson}>
                  Export JSON
               </button>
               <button type="button" className="btn btn-ghost" onClick={() => fileInput.current?.click()}>
                  Import JSON
               </button>
               <input
                  ref={fileInput}
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                  onChange={(e) => {
                     const file = e.target.files?.[0];
                     if (file) void importJson(file);
                     e.target.value = "";
                  }}
               />
               <button type="button" className="btn btn-ghost" onClick={reset}>
                  Reset to starter
               </button>
               {saveMsg && (
                  <span className={`text-small ${saveMsg.tone === "error" ? "text-warning" : "text-success"}`} role="status">
                     {saveMsg.text}
                  </span>
               )}
            </div>
         </header>

         <div className="grid gap-l lg:grid-cols-[1.25fr_1fr]">
            <SceneView
               robot={sceneRobot}
               env={env}
               verdict={envResult.verdict}
               moving={envResult.verdict !== "fail"}
               robotName={build.name || arche?.name || "Robot"}
            />
            <TestsPanel results={results} envId={env.id} onSelect={setEnvId} />
         </div>

         <section aria-label="Build details" className="flex flex-col gap-m">
            <div role="tablist" aria-label="Build details" className="lab-tabs">
               {TABS.map((t, i) => (
                  <button
                     key={t.id}
                     ref={(el) => void (tabRefs.current[i] = el)}
                     role="tab"
                     type="button"
                     id={`tab-${t.id}`}
                     aria-selected={tab === t.id}
                     aria-controls={`panel-${t.id}`}
                     tabIndex={tab === t.id ? 0 : -1}
                     onClick={() => setTab(t.id)}
                     onKeyDown={(e) => onTabKey(e, i)}
                  >
                     {t.label}
                     {t.id === "issues" && counts.error + counts.warning > 0 && (
                        <span className="ml-2xs text-warning">({counts.error + counts.warning})</span>
                     )}
                  </button>
               ))}
            </div>
            <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0} className="outline-none">
               {tab === "issues" && <IssuesPanel report={report} onShow={showIssue} activeId={activeIssue?.id ?? null} />}
               {tab === "parts" && (
                  <PartsPanel build={build} highlight={highlight} onAdd={addPart} onRemove={removePart} onChange={changePart} />
               )}
               {tab === "wiring" && (
                  <WiringPanel build={build} issues={report.issues} highlight={highlight} onAddWire={addWire} onRemoveWire={removeWire} />
               )}
               {tab === "power" && <PowerPanel stats={report.stats} compute={analysis.compute} />}
               {tab === "advisor" && (
                  <AdvisorPanel build={build} user={account.user} loading={account.loading} onUsed={() => void account.refresh()} />
               )}
            </div>
            {activeIssue && tab === "issues" && (
               <p className="font-mono text-caption text-camera" role="status">
                  Highlighted parts [{activeIssue.uids.join(", ")}] are outlined on the Parts and Wiring tabs.
               </p>
            )}
         </section>
      </div>
   );
}
