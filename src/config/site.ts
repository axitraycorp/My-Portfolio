// Single source of truth for personal details and URLs used across the site.
export const siteConfig = {
  name: "Hagon",
  title: "Hagon | Full-Stack Web Architect",
  description: "Portfolio of Hagon, a Senior Full-Stack Developer & Tech Architect.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://hagon.dev",
  links: {
    github: "https://github.com/axitraycorp",
    linkedin: "https://www.linkedin.com/in/hn-axi-tray/",
    email: "mailto:axitray@gmail.com",
  },
};
