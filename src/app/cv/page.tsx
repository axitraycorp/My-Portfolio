import type { Metadata } from "next";
import Link from "next/link";
import {
   currentMilestone,
   education,
   experience,
   milestones,
   profile,
   projects,
   recruiter,
   skillGroups,
} from "@/content/profile";
import { formatYears, publicList, publicText } from "@/lib/content";
import { siteConfig } from "@/config/site";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = {
   title: "CV",
   description: `CV of ${profile.name}, ${profile.title}.`,
   alternates: { canonical: "/cv" },
};

const STATUS: Record<string, string> = {
   done: "Complete",
   active: "In progress",
   planned: "Planned",
};

export default function CvPage() {
   const location = publicText(profile.location);
   const site = siteConfig.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
   const current = currentMilestone();
   const flagship = projects.find((p) => p.flagship);
   const side = projects.filter((p) => !p.flagship);
   const facts = [
      ["Availability", publicText(recruiter.availability)],
      ["Work rights", publicText(recruiter.workRights)],
      ["Open to", publicList(recruiter.openTo).join(", ") || null],
   ].filter((f): f is [string, string] => f[1] !== null);

   return (
      <div className="cv-page px-gutter py-xl">
         <div className="cv-toolbar mx-auto mb-m flex max-w-[52rem] flex-wrap items-center justify-between gap-s">
            <Link href="/" className="font-mono text-small text-muted hover:text-ink">
               ← Back to portfolio
            </Link>
            <PrintButton />
         </div>

         <article className="cv mx-auto max-w-[52rem]" aria-label={`CV of ${profile.name}`}>
            <header className="cv__header">
               <h1 className="cv__name">{profile.name}</h1>
               {profile.legalName !== profile.name && (
                  <p className="cv__legal">Legal name: {profile.legalName}</p>
               )}
               <p className="cv__title">{profile.title}</p>
               <ul className="cv__contact">
                  <li>
                     <a href={`mailto:${profile.email}`}>{profile.email}</a>
                  </li>
                  <li>
                     <a href={profile.links.linkedin}>
                        {profile.links.linkedin
                           .replace(/^https?:\/\/(www\.)?/, "")
                           .replace(/\/$/, "")}
                     </a>
                  </li>
                  <li>
                     <a href={profile.links.github}>
                        {profile.links.github.replace(/^https?:\/\//, "")}
                     </a>
                  </li>
                  <li>
                     <a href={siteConfig.url}>{site}</a>
                  </li>
                  {location && <li>{location}</li>}
               </ul>
            </header>

            <section className="cv__section" aria-labelledby="cv-summary">
               <h2 id="cv-summary">Summary</h2>
               <p>{recruiter.summary}</p>
               <dl className="cv__facts">
                  <div>
                     <dt>Target roles</dt>
                     <dd>{recruiter.targetRoles.join(" · ")}</dd>
                  </div>
                  {facts.map(([label, value]) => (
                     <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                     </div>
                  ))}
               </dl>
            </section>

            <section className="cv__section" aria-labelledby="cv-skills">
               <h2 id="cv-skills">Skills</h2>
               <dl className="cv__skills">
                  {skillGroups.map((g) => (
                     <div key={g.id}>
                        <dt>{g.title}</dt>
                        <dd>{g.skills.join(", ")}</dd>
                     </div>
                  ))}
               </dl>
            </section>

            <section className="cv__section" aria-labelledby="cv-experience">
               <h2 id="cv-experience">Experience</h2>
               {experience.map((job) => {
                  const org = publicText(job.organisation);
                  const where = publicText(job.location);
                  const achievements = publicList(job.achievements);
                  return (
                     <div key={job.role} className="cv__item">
                        <div className="cv__item-head">
                           <h3>
                              {job.role}
                              {org && <span className="cv__org"> · {org}</span>}
                           </h3>
                           <span>
                              {formatYears(job.start, job.end)}
                              {where && ` · ${where}`}
                           </span>
                        </div>
                        <p>{job.summary}</p>
                        {achievements.length > 0 && (
                           <ul>
                              {achievements.map((a) => (
                                 <li key={a}>{a}</li>
                              ))}
                           </ul>
                        )}
                     </div>
                  );
               })}
            </section>

            <section className="cv__section" aria-labelledby="cv-education">
               <h2 id="cv-education">Education</h2>
               {education.map((ed) => {
                  const institution = publicText(ed.institution);
                  const highlights = publicList(ed.highlights);
                  return (
                     <div key={ed.degree} className="cv__item">
                        <div className="cv__item-head">
                           <h3>
                              {ed.degree}
                              {institution && <span className="cv__org"> · {institution}</span>}
                           </h3>
                           <span>{ed.year}</span>
                        </div>
                        {highlights.length > 0 && (
                           <ul>
                              {highlights.map((h) => (
                                 <li key={h}>{h}</li>
                              ))}
                           </ul>
                        )}
                     </div>
                  );
               })}
            </section>
            <section className="cv__section" aria-labelledby="cv-projects">
               <h2 id="cv-projects">Projects</h2>
               {flagship && (
                  <div className="cv__item">
                     <div className="cv__item-head">
                        <h3>{flagship.title}</h3>
                        <span>
                           {STATUS[flagship.status]}
                           {current && ` · milestone ${current.number} of ${milestones.length}`}
                        </span>
                     </div>
                     <p>{flagship.summary}</p>
                     <ul>
                        {flagship.approach.slice(0, 3).map((a) => (
                           <li key={a}>{a}</li>
                        ))}
                     </ul>
                     <p className="cv__meta">
                        <strong>Stack:</strong> {flagship.stack.join(", ")} ·{" "}
                        <a href={`${siteConfig.url}/projects/${flagship.slug}`}>build log</a>
                     </p>
                  </div>
               )}
               {side.map((p) => (
                  <div key={p.slug} className="cv__item">
                     <div className="cv__item-head">
                        <h3>{p.title}</h3>
                        <span>{STATUS[p.status]}</span>
                     </div>
                     <p>{p.summary}</p>
                     <p className="cv__meta">
                        <strong>Stack:</strong> {p.stack.join(", ")}
                     </p>
                  </div>
               ))}
            </section>
         </article>
      </div>
   );
}
