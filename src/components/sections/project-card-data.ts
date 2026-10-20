import type { Project } from "@/content/profile";

/** Only what a project card shows; a client component's props are serialised into the page. */
export type ProjectCardData = Pick<
   Project,
   "slug" | "title" | "summary" | "stack" | "status" | "flagship"
>;

export function toCardData({
   slug,
   title,
   summary,
   stack,
   status,
   flagship,
}: Project): ProjectCardData {
   return { slug, title, summary, stack, status, flagship };
}
