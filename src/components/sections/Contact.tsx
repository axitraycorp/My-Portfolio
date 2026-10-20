import { Download, Github, Linkedin } from "lucide-react";
import { profile } from "@/content/profile";
import { HudFrame } from "@/components/hud/HudFrame";
import { TopicLabel } from "@/components/hud/TopicLabel";
import { ContactForm } from "@/components/ContactForm";
import { CopyEmail } from "./CopyEmail";

export function Contact() {
   const { links } = profile;
   return (
      <section id="contact" aria-labelledby="contact-title" className="section">
         <div className="section__inner grid gap-xl md:grid-cols-[1fr_1.1fr]">
            <div className="flex flex-col gap-m">
               <TopicLabel topic="/comms/open" channel="camera" />
               <h2 id="contact-title" className="section__title">
                  Let&apos;s talk robots
               </h2>
               <p className="text-lead text-muted">
                  Robotics, perception, edge AI — or how to run a reliable operation. I read every
                  message.
               </p>
               <CopyEmail email={profile.email} />
               <ul className="flex flex-wrap gap-xs">
                  <li>
                     <a
                        href={links.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost"
                     >
                        <Github className="size-4" aria-hidden="true" /> GitHub
                     </a>
                  </li>
                  <li>
                     <a
                        href={links.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost"
                     >
                        <Linkedin className="size-4" aria-hidden="true" /> LinkedIn
                     </a>
                  </li>
                  <li>
                     {links.cv ? (
                        <a href={links.cv} download className="btn btn-ghost">
                           <Download className="size-4" aria-hidden="true" /> Download CV
                        </a>
                     ) : (
                        <span className="btn btn-ghost" aria-disabled="true" title="CV coming soon">
                           <Download className="size-4" aria-hidden="true" /> CV coming soon
                        </span>
                     )}
                  </li>
               </ul>
            </div>
            <HudFrame surface channel="camera" className="p-m sm:p-l">
               <h3 className="mono-caps mb-m">Send a message</h3>
               <ContactForm />
            </HudFrame>
         </div>
      </section>
   );
}
