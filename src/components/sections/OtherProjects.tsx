import { projects } from "@/content/profile";
import { TopicLabel } from "@/components/hud/TopicLabel";
import { ProjectCard } from "./ProjectCard";
import { toCardData } from "./project-card-data";

export function OtherProjects() {
   const side = projects.filter((p) => !p.flagship);
   return (
      <section id="projects" aria-labelledby="projects-title" className="section">
         <div className="section__inner">
            <TopicLabel topic="/lab/projects" channel="fused" className="section__eyebrow" />
            <h2 id="projects-title" className="section__title">
               Other projects
            </h2>
            <p className="section__lead">
               Two projects that come straight from hotel operations — where I know the problem
               first-hand.
            </p>
            <div className="project-cards mt-xl">
               <ul className="project-cards__grid">
                  {side.map((project) => (
                     <li key={project.slug}>
                        <ProjectCard project={toCardData(project)} />
                     </li>
                  ))}
               </ul>
            </div>
         </div>
      </section>
   );
}
