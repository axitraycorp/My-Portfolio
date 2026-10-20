import type { Metadata } from "next";

// Admin-only page: keep it out of search results
export const metadata: Metadata = {
   title: "New Project | Admin",
   robots: { index: false, follow: false },
};

export default function NewProjectLayout({ children }: { children: React.ReactNode }) {
   return children;
}
