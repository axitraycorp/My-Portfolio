import { graphqlRequest } from "@/lib/api";

export type Project = {
  title: string;
  description: string;
  tech: string[];
  link: string;
};

// Shown when the backend is unreachable or has no projects yet.
export const fallbackProjects: Project[] = [
  {
    title: "DevOps Dashboard",
    description:
      "CI/CD pipelines with GitHub Actions, Docker, and Kubernetes. Full monitoring and logs.",
    tech: ["Next.js", "Docker", "K8s", "GitHub Actions"],
    link: "https://github.com/axitraycorp",
  },
  {
    title: "AI SaaS Starter",
    description:
      "OpenAI-powered SaaS boilerplate with billing (Stripe), auth (Clerk), and multi-tenant dashboards.",
    tech: ["Next.js", "OpenAI", "Clerk", "Stripe"],
    link: "https://github.com/axitraycorp",
  },
  {
    title: "Realtime Chat App",
    description: "WebSocket-based chat using Supabase. Scalable to thousands of users.",
    tech: ["Supabase", "Next.js", "TypeScript", "TailwindCSS"],
    link: "https://github.com/axitraycorp",
  },
];

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

function toProject(p: ApiProject): Project {
  const tech = p.skills.length
    ? p.skills.map((s) => s.name)
    : p.techStack.split(",").map((t) => t.trim()).filter(Boolean);
  return {
    title: p.title,
    description: p.description,
    tech,
    link: p.liveUrl || p.githubUrl,
  };
}

/** Projects from the backend (revalidated every minute), or the static fallback. */
export async function getProjects(): Promise<Project[]> {
  try {
    const data = await graphqlRequest<{ projects: ApiProject[] }>(PROJECTS_QUERY, {
      // Free-tier backends can take ~50s to wake; don't block page renders on that
      init: { next: { revalidate: 60 }, signal: AbortSignal.timeout(8000) },
    });
    return data.projects.length ? data.projects.map(toProject) : fallbackProjects;
  } catch {
    return fallbackProjects;
  }
}
