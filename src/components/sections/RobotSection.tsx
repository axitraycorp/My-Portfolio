import { flagship } from "@/content/profile";
import { publicText } from "@/lib/content";
import { HudFrame } from "@/components/hud/HudFrame";
import { StatusPill } from "@/components/hud/StatusPill";
import { TopicLabel } from "@/components/hud/TopicLabel";
import { TransitionLink } from "@/lib/view-transition";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { Tbc } from "./Tbc";

export function RobotSection() {
   const project = flagship;
   return (
      <section id="robot" aria-labelledby="robot-title" className="section">
         <div className="section__inner">
            <div className="section__eyebrow flex flex-wrap items-center gap-s">
               <TopicLabel topic="/robot/description" channel="fused" />
               <StatusPill status={project.status} />
            </div>
            <h2
               id="robot-title"
               className="section__title"
               style={{ viewTransitionName: `project-title-${project.slug}` }}
            >
               {project.title}
            </h2>
            <p className="section__lead">{project.summary}</p>

            <dl id="specs" className="spec-grid mt-xl">
               {project.specs.map((spec) => {
                  const value = publicText(spec.value);
                  return (
                     <HudFrame
                        key={spec.id}
                        channel={spec.channel}
                        surface
                        className="spec-grid__item p-m"
                     >
                        <dt className="mono-caps">{spec.label}</dt>
                        <dd className="mt-2xs font-display text-lead font-medium">
                           {value ?? <Tbc>model to be confirmed</Tbc>}
                        </dd>
                     </HudFrame>
                  );
               })}
            </dl>

            <div className="mt-xl">
               <div className="mb-s flex flex-wrap items-baseline justify-between gap-s">
                  <h3 className="font-display text-h3 font-medium">Perception pipeline</h3>
                  <TopicLabel topic="/rosgraph" channel="neutral" />
               </div>
               <HudFrame surface className="p-s sm:p-m">
                  <ArchitectureDiagram
                     id="architecture"
                     architecture={project.architecture}
                     title="ROS 2 perception and grasping pipeline"
                  />
               </HudFrame>
            </div>

            <TransitionLink href={`/projects/${project.slug}`} className="btn btn-ghost mt-l">
               Read the full build →
            </TransitionLink>
         </div>
      </section>
   );
}
