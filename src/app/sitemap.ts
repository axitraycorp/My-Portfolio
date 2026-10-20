import type { MetadataRoute } from "next";
import { projects } from "@/content/profile";
import { siteConfig } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
   const base = siteConfig.url.replace(/\/$/, "");
   return [
      { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
      { url: `${base}/projects`, changeFrequency: "weekly", priority: 0.8 },
      ...projects.map((p) => ({
         url: `${base}/projects/${p.slug}`,
         changeFrequency: "weekly" as const,
         priority: p.flagship ? 0.9 : 0.6,
      })),
   ];
}
