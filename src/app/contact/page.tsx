import type { Metadata } from "next";
import FadeIn from "@/components/FadeIn";
import { ContactForm } from "@/components/ContactForm";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Contact | Hagon" };

export default function ContactPage() {
  return (
    <FadeIn>
      <section className="space-y-12 py-16">
        <h1 className="text-3xl font-bold">Contact Me</h1>

        <p className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl leading-relaxed">
          Whether you&apos;re building a new product, scaling an existing platform, or just want
          to connect — I&apos;d love to hear from you.
        </p>

        {/* Direct contact links */}
        <div className="flex flex-wrap gap-6">
          <ContactLink label="Email" href={siteConfig.links.email} />
          <ContactLink label="GitHub" href={siteConfig.links.github} />
          <ContactLink label="LinkedIn" href={siteConfig.links.linkedin} />
        </div>

        <ContactForm />
      </section>
    </FadeIn>
  );
}

function ContactLink({ label, href }: { label: string; href: string }) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      className="text-lg hover:underline underline-offset-4"
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
    >
      {label}
    </a>
  );
}
