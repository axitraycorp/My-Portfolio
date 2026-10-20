import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AssistantRoot } from "@/components/assistant/AssistantRoot";
import { ViewTransitionListener } from "@/lib/view-transition";
import { headScript } from "@/lib/theme";
import { siteConfig } from "@/config/site";
import { education, profile, sections, skillGroups, tourSteps } from "@/content/profile";
import { publicText } from "@/lib/content";

const display = Space_Grotesk({
   variable: "--font-space-grotesk",
   subsets: ["latin"],
   display: "swap",
});
const body = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({
   variable: "--font-jetbrains-mono",
   subsets: ["latin"],
   display: "swap",
});

export const metadata: Metadata = {
   metadataBase: new URL(siteConfig.url),
   title: { default: siteConfig.title, template: `%s | ${profile.name}` },
   description: siteConfig.description,
   applicationName: `${profile.name} — portfolio`,
   authors: [{ name: profile.name, url: siteConfig.url }],
   alternates: { canonical: "/" },
   openGraph: {
      type: "website",
      url: "/",
      siteName: `${profile.name} — ${profile.title}`,
      title: siteConfig.title,
      description: siteConfig.description,
   },
   twitter: {
      card: "summary_large_image",
      title: siteConfig.title,
      description: siteConfig.description,
   },
};

export const viewport: Viewport = {
   themeColor: [
      { media: "(prefers-color-scheme: dark)", color: "#0e1117" },
      { media: "(prefers-color-scheme: light)", color: "#fbfbfd" },
   ],
   viewportFit: "cover",
};

function personJsonLd() {
   const alumni = education
      .map((e) => publicText(e.institution))
      .filter((name): name is string => name !== null)
      .map((name) => ({ "@type": "CollegeOrUniversity", name }));
   return {
      "@context": "https://schema.org",
      "@type": "Person",
      name: profile.name,
      jobTitle: profile.title,
      description: profile.thesis,
      url: siteConfig.url,
      email: `mailto:${profile.email}`,
      sameAs: [profile.links.github, profile.links.linkedin],
      knowsAbout: skillGroups.flatMap((g) => g.skills),
      ...(alumni.length > 0 && { alumniOf: alumni }),
      ...(publicText(profile.location) && {
         address: { "@type": "PostalAddress", addressLocality: publicText(profile.location) },
      }),
   };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
   return (
      <html
         lang="en"
         suppressHydrationWarning
         className={`${display.variable} ${body.variable} ${mono.variable}`}
      >
         <head>
            <script dangerouslySetInnerHTML={{ __html: headScript }} />
            <script
               type="application/ld+json"
               dangerouslySetInnerHTML={{
                  __html: JSON.stringify(personJsonLd()).replace(/</g, "\\u003c"),
               }}
            />
         </head>
         <body>
            <a href="#main" className="skip-link">
               Skip to content
            </a>
            <Navbar name={profile.name} links={sections.filter((s) => s.id !== "hero")} />
            <main id="main" tabIndex={-1} className="outline-none">
               {children}
            </main>
            <Footer />
            <ViewTransitionListener />
            <AssistantRoot tourSteps={tourSteps} />
         </body>
      </html>
   );
}
