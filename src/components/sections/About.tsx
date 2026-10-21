import { aboutStory, education, experience, skillGroups, skillTransfers } from "@/content/profile";
import { formatYears, publicList, publicText } from "@/lib/content";
import { HudFrame } from "@/components/hud/HudFrame";
import { TopicLabel } from "@/components/hud/TopicLabel";
import { Tbc } from "./Tbc";

export function About() {
   return (
      <section id="about" aria-labelledby="about-title" className="section">
         <div className="section__inner">
            <TopicLabel topic="/operator/profile" channel="lidar" className="section__eyebrow" />
            <h2 id="about-title" className="section__title">
               From hotel operations to robotics
            </h2>
            <div className="mt-m grid gap-s text-lead text-muted md:max-w-[62ch]">
               {aboutStory.map((p) => (
                  <p key={p.slice(0, 24)}>{p}</p>
               ))}
            </div>

            {/* Skills transfer: hotel ops skill → engineering skill */}
            <div className="mt-xl">
               <div className="transfer__head" aria-hidden="true">
                  <TopicLabel topic="/hotel/ops" channel="lidar" />
                  <TopicLabel topic="/robot/engineering" channel="camera" />
               </div>
               <ul
                  id="skills-transfer"
                  className="transfer"
                  aria-label="How hotel operations skills transfer to engineering"
               >
                  {skillTransfers.map((t) => (
                     <li key={t.from} className="transfer__row">
                        <span className="transfer__from">{t.from}</span>
                        <span className="transfer__arrow" aria-hidden="true" />
                        <span className="sr-only">becomes</span>
                        <span className="transfer__to">
                           <span className="block font-medium text-ink">{t.to}</span>
                           <span className="mt-3xs block text-small text-muted">{t.detail}</span>
                        </span>
                     </li>
                  ))}
               </ul>
            </div>

            <div className="mt-xl grid gap-m md:grid-cols-2">
               {experience.map((job) => {
                  const org = publicText(job.organisation);
                  const achievements = publicList(job.achievements);
                  return (
                     <HudFrame key={job.role} as="article" channel="lidar" surface className="p-m">
                        <p className="mono-caps">Experience · {formatYears(job.start, job.end)}</p>
                        <h3 className="mt-2xs font-display text-h3 font-medium">{job.role}</h3>
                        <p className="text-muted">{org ?? <Tbc>hotel name to be confirmed</Tbc>}</p>
                        <p className="mt-s">{job.summary}</p>
                        {achievements.length > 0 && (
                           <ul className="timeline__list mt-s">
                              {achievements.map((a) => (
                                 <li key={a}>{a}</li>
                              ))}
                           </ul>
                        )}
                     </HudFrame>
                  );
               })}
               {education.map((ed) => {
                  const institution = publicText(ed.institution);
                  const highlights = publicList(ed.highlights);
                  return (
                     <HudFrame
                        key={ed.degree}
                        as="article"
                        channel="camera"
                        surface
                        className="p-m"
                     >
                        <p className="mono-caps">Education · {ed.year}</p>
                        <h3 className="mt-2xs font-display text-h3 font-medium">{ed.degree}</h3>
                        <p className="text-muted">
                           {institution ?? <Tbc>university to be confirmed</Tbc>}
                        </p>
                        {highlights.length > 0 && (
                           <ul className="timeline__list mt-s">
                              {highlights.map((h) => (
                                 <li key={h}>{h}</li>
                              ))}
                           </ul>
                        )}
                     </HudFrame>
                  );
               })}
            </div>

            <div className="mt-xl grid gap-m sm:grid-cols-2 lg:grid-cols-4">
               {skillGroups.map((group) => (
                  <div key={group.id}>
                     <h3 className="mono-caps mb-2xs">{group.title}</h3>
                     <ul className="flex flex-wrap gap-2xs">
                        {group.skills.map((s) => (
                           <li key={s} className="chip">
                              {s}
                           </li>
                        ))}
                     </ul>
                  </div>
               ))}
            </div>
         </div>
      </section>
   );
}
