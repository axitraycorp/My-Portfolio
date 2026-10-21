import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Github } from "lucide-react";
import { getMetric, getProject, milestones, projects } from "@/content/profile";
import { publicList } from "@/lib/content";
import { HudFrame } from "@/components/hud/HudFrame";
import { StatusPill } from "@/components/hud/StatusPill";
import { TopicLabel } from "@/components/hud/TopicLabel";
import { ArchitectureDiagram } from "@/components/sections/ArchitectureDiagram";
import { ResultsTable } from "@/components/sections/ResultsTable";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
   return projects.map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
   const { slug } = await params;
   const project = getProject(slug);
   if (!project) return {};
   return {
      title: project.title,
      description: project.summary,
      alternates: { canonical: `/projects/${project.slug}` },
      openGraph: {
         title: project.title,
         description: project.summary,
         url: `/projects/${project.slug}`,
         type: "article",
      },
      twitter: { title: project.title, description: project.summary },
   };
}

export default async function ProjectPage({ params }: { params: Promise<Params> }) {
   const { slug } = await params;
   const project = getProject(slug);
   if (!project) notFound();

   const metricIds = project.flagship ? milestones.flatMap((m) => m.metrics) : [];
   const metrics = metricIds.map(getMetric).filter((m) => m !== undefined);
   const lessons = publicList(project.lessons);
   const lastMilestone = milestones[milestones.length - 1];

   return (
      <article className="px-gutter pb-section">
         <header className="mx-auto max-w-content pt-xl">
            <nav aria-label="Breadcrumb" className="mb-m font-mono text-small text-muted">
               <Link href="/#projects" className="hover:text-ink">
                  projects
               </Link>
               <span aria-hidden="true"> / </span>
               <span aria-current="page">{project.slug}</span>
            </nav>
            <HudFrame
               channel={project.flagship ? "fused" : "camera"}
               surface
               className="p-m sm:p-l"
               style={{ viewTransitionName: `project-frame-${project.slug}` }}
            >
               <div className="flex flex-wrap items-center gap-s">
                  <StatusPill status={project.status} />
                  <span className="mono-caps">
                     {project.flagship ? "Flagship" : "Side project"}
                  </span>
               </div>
               <h1
                  className="mt-s text-h1 font-semibold"
                  style={{ viewTransitionName: `project-title-${project.slug}` }}
               >
                  {project.title}
               </h1>
               <p className="mt-s max-w-[62ch] text-lead text-muted">{project.summary}</p>
               <ul className="mt-m flex flex-wrap gap-2xs" aria-label="Stack">
                  {project.stack.map((s) => (
                     <li key={s} className="chip">
                        {s}
                     </li>
                  ))}
               </ul>
               {(project.repoUrl || project.demoUrl) && (
                  <div className="mt-m flex flex-wrap gap-xs">
                     {project.repoUrl && (
                        <a
                           href={project.repoUrl}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="btn btn-ghost"
                        >
                           <Github className="size-4" aria-hidden="true" /> Source
                        </a>
                     )}
                     {project.demoUrl && (
                        <a
                           href={project.demoUrl}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="btn btn-primary"
                        >
                           <ExternalLink className="size-4" aria-hidden="true" /> Live demo
                        </a>
                     )}
                  </div>
               )}
            </HudFrame>
         </header>

         <div className="detail mx-auto mt-xl max-w-content">
            <section aria-labelledby="problem" className="detail__section">
               <TopicLabel topic="/case/problem" channel="lidar" />
               <h2 id="problem" className="detail__title">
                  Problem
               </h2>
               <p className="detail__prose">{project.problem}</p>
            </section>

            <section aria-labelledby="approach" className="detail__section">
               <TopicLabel topic="/case/approach" channel="camera" />
               <h2 id="approach" className="detail__title">
                  Approach
               </h2>
               <ol className="detail__steps">
                  {project.approach.map((step) => (
                     <li key={step}>{step}</li>
                  ))}
               </ol>
            </section>

            <section aria-labelledby="architecture-title" className="detail__section">
               <TopicLabel topic="/case/architecture" channel="fused" />
               <h2 id="architecture-title" className="detail__title">
                  Architecture
               </h2>
               <HudFrame surface className="mt-m p-s sm:p-m">
                  <ArchitectureDiagram
                     id="architecture"
                     architecture={project.architecture}
                     title={`${project.title} architecture`}
                  />
               </HudFrame>
            </section>

            <section aria-labelledby="results-title" className="detail__section">
               <TopicLabel topic="/case/results" channel="lidar" />
               <h2 id="results-title" className="detail__title">
                  Results
               </h2>
               {metrics.length > 0 ? (
                  <div className="mt-m">
                     <ResultsTable metrics={metrics} caption={`${project.title} metrics`} />
                  </div>
               ) : (
                  <p className="detail__prose">
                     No results yet — this project is{" "}
                     {project.status === "planned" ? "planned" : "in progress"}. Measurements will
                     be published here, not estimated.
                  </p>
               )}
            </section>

            <section aria-labelledby="demo-title" className="detail__section">
               <TopicLabel topic="/case/demo" channel="camera" />
               <h2 id="demo-title" className="detail__title">
                  Demo
               </h2>
               <HudFrame
                  channel="camera"
                  surface
                  className="mt-m aspect-video w-full overflow-hidden"
               >
                  {project.media.video ? (
                     <video
                        src={project.media.video}
                        controls
                        preload="none"
                        className="size-full"
                        aria-label={project.media.alt}
                     />
                  ) : (
                     <div className="demo-slot">
                        <span className="demo-slot__rec" aria-hidden="true">
                           ● REC
                        </span>
                        <p className="font-mono text-small text-muted">
                           {project.flagship
                              ? `Demo video recording after milestone ${lastMilestone.number}: ${lastMilestone.title.toLowerCase()}.`
                              : "Demo video will be added once the project is built."}
                        </p>
                     </div>
                  )}
               </HudFrame>
            </section>

            <section aria-labelledby="lessons-title" className="detail__section">
               <TopicLabel topic="/case/lessons" channel="fused" />
               <h2 id="lessons-title" className="detail__title">
                  Lessons learned
               </h2>
               {lessons.length > 0 ? (
                  <ul className="detail__steps">
                     {lessons.map((l) => (
                        <li key={l}>{l}</li>
                     ))}
                  </ul>
               ) : (
                  <p className="detail__prose">
                     Lessons are written up as milestones complete — check back after the next one.
                  </p>
               )}
            </section>

            <nav aria-label="Project navigation" className="mt-xl flex flex-wrap gap-xs">
               <Link href="/#projects" className="btn btn-ghost">
                  ← All projects
               </Link>
               {project.flagship && (
                  <Link href="/#build-log" className="btn btn-ghost">
                     Build log
                  </Link>
               )}
            </nav>
         </div>
      </article>
   );
}
