import { graphqlRequest } from "@/lib/api";

/** A project added through the /projects/new admin page (stored in the backend). */
export type LabProject = {
   title: string;
   description: string;
   tech: string[];
   link: string;
};

type ApiProject = {
   title: string;
   description: string;
   techStack: string;
   githubUrl: string;
   liveUrl: string | null;
   skills: { name: string }[];
};

const PROJECTS_QUERY = `
  query Projects {
    projects {
      title
      description
      techStack
      githubUrl
      liveUrl
      skills { name }
    }
  }
`;

function toLabProject(p: ApiProject): LabProject {
   const tech = p.skills.length
      ? p.skills.map((s) => s.name)
      : p.techStack
           .split(",")
           .map((t) => t.trim())
           .filter(Boolean);
   return {
      title: p.title,
      description: p.description,
      tech,
      link: p.liveUrl || p.githubUrl,
   };
}

/**
 * Projects from the backend, revalidated every minute. Next's data cache keeps
 * serving the last good response while a refresh fails (e.g. backend asleep);
 * an empty list is returned only if nothing was ever fetched.
 */
export async function getLabProjects(): Promise<LabProject[]> {
   try {
      const data = await graphqlRequest<{ projects: ApiProject[] }>(PROJECTS_QUERY, {
         // Free-tier backends can take ~50s to wake; don't block page renders on that
         init: { next: { revalidate: 60 }, signal: AbortSignal.timeout(8000) },
      });
      return data.projects.map(toLabProject);
   } catch {
      return [];
   }
}
