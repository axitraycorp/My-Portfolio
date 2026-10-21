import Link from "next/link";
import { FileText, Linkedin, Mail } from "lucide-react";
import { profile, recruiter } from "@/content/profile";
import { publicList, publicText } from "@/lib/content";
import { HudFrame } from "@/components/hud/HudFrame";
import { TopicLabel } from "@/components/hud/TopicLabel";

/** Ten-second summary for recruiters, right under the hero. Unfilled (TODO) facts are omitted. */
export function AtAGlance() {
   const facts = [
      ["Availability", publicText(recruiter.availability)],
      ["Location", publicText(profile.location)],
      ["Work rights", publicText(recruiter.workRights)],
      ["Open to", publicList(recruiter.openTo).join(" · ") || null],
   ].filter((f): f is [string, string] => f[1] !== null);

   return (
      <section aria-labelledby="at-a-glance-title" className="px-gutter pb-xl">
         <HudFrame
            id="at-a-glance"
            as="div"
            channel="fused"
            surface
            className="mx-auto max-w-content p-m sm:p-l"
         >
            <div className="flex flex-wrap items-baseline justify-between gap-s">
               <h2 id="at-a-glance-title" className="mono-caps">
                  At a glance · for recruiters
               </h2>
               <TopicLabel topic="/operator/summary" channel="fused" />
            </div>

            <div className="mt-m grid gap-l md:grid-cols-[1.1fr_1fr]">
               <div>
                  <p className="mono-caps">Looking for</p>
                  <ul className="mt-2xs flex flex-wrap gap-2xs" aria-label="Target roles">
                     {recruiter.targetRoles.map((role) => (
                        <li
                           key={role}
                           className="rounded-hud border border-camera/50 px-xs py-3xs font-display text-body font-medium text-ink"
                        >
                           {role}
                        </li>
                     ))}
                  </ul>
                  {facts.length > 0 && (
                     <dl className="mt-m grid grid-cols-[auto_1fr] gap-x-m gap-y-2xs text-small">
                        {facts.map(([label, value]) => (
                           <div key={label} className="contents">
                              <dt className="font-mono text-muted">{label}</dt>
                              <dd className="text-ink">{value}</dd>
                           </div>
                        ))}
                     </dl>
                  )}
               </div>

               <div>
                  <p className="mono-caps">Highlights</p>
                  <ul className="timeline__list mt-2xs">
                     {publicList(recruiter.highlights).map((h) => (
                        <li key={h}>{h}</li>
                     ))}
                  </ul>
               </div>
            </div>

            <div className="mt-l flex flex-wrap gap-xs border-t border-line pt-m">
               <Link href="/cv" className="btn btn-primary">
                  <FileText className="size-4" aria-hidden="true" /> View CV
               </Link>
               <a href={`mailto:${profile.email}`} className="btn btn-ghost">
                  <Mail className="size-4" aria-hidden="true" /> Email
               </a>
               <a
                  href={profile.links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
               >
                  <Linkedin className="size-4" aria-hidden="true" /> LinkedIn
               </a>
            </div>
         </HudFrame>
      </section>
   );
}
