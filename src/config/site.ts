// Single source of truth for personal details and URLs used across the site.
// TODO: replace the GitHub / LinkedIn handles with your real profiles.
export const siteConfig = {
  name: "Hagon",
  title: "Hagon | Full-Stack Web Architect",
  description: "Portfolio of Hagon, a Senior Full-Stack Developer & Tech Architect.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://hagon.dev",
  links: {
    github: "https://github.com/yourusername",
    linkedin: "https://linkedin.com/in/yourusername",
    email: "mailto:nguyenviethoang14112000@gmail.com",
  },
};
