"use client";

import { useRef } from "react";
import type { Project } from "@/content/profile";
import { StatusPill } from "@/components/hud/StatusPill";
import { TransitionLink } from "@/lib/view-transition";

/**
 * Project card with a cursor-following spotlight and an animated gradient
 * border. The title and frame share view-transition names with the detail
 * page header, so the card morphs into it on navigation.
 */
export function ProjectCard({ project }: { project: Project }) {
   const ref = useRef<HTMLAnchorElement>(null);

   const onPointerMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
      const el = ref.current;
      if (!el || e.pointerType !== "mouse") return;
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      el.style.setProperty("--my", `${e.clientY - rect.top}px`);
   };

   return (
      <TransitionLink
         ref={ref}
         href={`/projects/${project.slug}`}
         id={`project-${project.slug}`}
         className="project-card"
         onPointerMove={onPointerMove}
         style={{ viewTransitionName: `project-frame-${project.slug}` }}
      >
         <div className="project-card__body">
            <div className="project-card__head">
               <StatusPill status={project.status} />
               <span className="mono-caps">{project.flagship ? "Flagship" : "Side project"}</span>
            </div>
            <h3
               className="project-card__title"
               style={{ viewTransitionName: `project-title-${project.slug}` }}
            >
               {project.title}
            </h3>
            <p className="project-card__summary">{project.summary}</p>
            <ul className="project-card__stack" aria-label="Stack">
               {project.stack.map((s) => (
                  <li key={s}>{s}</li>
               ))}
            </ul>
            <span className="project-card__cta" aria-hidden="true">
               Open case study →
            </span>
         </div>
      </TransitionLink>
   );
}
