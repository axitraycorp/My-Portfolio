import { profile } from "@/content/profile";

// Site-level settings derived from profile.ts (the single source of truth).
export const siteConfig = {
   name: profile.name,
   title: `${profile.name} | ${profile.title}`,
   description: profile.thesis,
   url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://my-portfolio-umber-ten-96.vercel.app",
   links: {
      github: profile.links.github,
      linkedin: profile.links.linkedin,
      email: `mailto:${profile.email}`,
   },
};
