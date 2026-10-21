import type { Metadata } from "next";
import { projects } from "@/content/profile";
import { getLabProjects } from "@/data/projectData";
import { TopicLabel } from "@/components/hud/TopicLabel";
import { ProjectCard } from "@/components/sections/ProjectCard";
import { toCardData } from "@/components/sections/project-card-data";

export const metadata: Metadata = {
   title: "Projects",
   description:
      "A Jetson mobile manipulator with camera–LiDAR perception, and side projects in AI and hotel operations.",
   alternates: { canonical: "/projects" },
};

export default async function ProjectsPage() {
   const lab = await getLabProjects();

   return (
      <div className="section border-t-0">
         <div className="section__inner">
            <TopicLabel topic="/lab/projects" channel="fused" className="section__eyebrow" />
            <h1 className="text-h1 font-semibold">Projects</h1>
            <p className="section__lead">
               One flagship robot, built in the open, and the side projects around it.
            </p>

            <div className="project-cards mt-xl">
               <ul className="project-cards__grid">
                  {projects.map((project) => (
                     <li key={project.slug}>
                        <ProjectCard project={toCardData(project)} />
                     </li>
                  ))}
               </ul>
            </div>

            {lab.length > 0 && (
               <section aria-labelledby="lab-title" className="mt-2xl">
                  <h2 id="lab-title" className="font-display text-h3 font-medium">
                     More from the lab
                  </h2>
                  <ul className="mt-m grid gap-m sm:grid-cols-2">
                     {lab.map((p) => (
                        <li key={p.title} className="hud-frame p-m" data-surface="">
                           <a
                              href={p.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group block"
                           >
                              <h3 className="font-display text-lead font-medium group-hover:text-camera">
                                 {p.title} ↗
                              </h3>
                              <p className="mt-2xs text-muted">{p.description}</p>
                              {p.tech.length > 0 && (
                                 <ul className="mt-s flex flex-wrap gap-2xs" aria-label="Stack">
                                    {p.tech.map((t) => (
                                       <li key={t} className="chip">
                                          {t}
                                       </li>
                                    ))}
                                 </ul>
                              )}
                           </a>
                        </li>
                     ))}
                  </ul>
               </section>
            )}
         </div>
      </div>
   );
}
