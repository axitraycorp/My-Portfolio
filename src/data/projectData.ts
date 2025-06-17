export type Project = {
    title: string;
    description: string;
    tech: string[];
    link: string;
};

export const projects: Project[] = [
    {
      title: "DevOps Dashboard",
      description:
        "CI/CD pipelines with GitHub Actions, Docker, and Kubernetes. Full monitoring and logs.",
      tech: ["Next.js", "Docker", "K8s", "GitHub Actions"],
      link: "https://github.com/yourusername/devops-dashboard",
    },
    {
      title: "AI SaaS Starter",
      description:
        "OpenAI-powered SaaS boilerplate with billing (Stripe), auth (Clerk), and multi-tenant dashboards.",
      tech: ["Next.js", "OpenAI", "Clerk", "Stripe"],
      link: "https://github.com/yourusername/ai-saas-starter",
    },
    {
      title: "Realtime Chat App",
      description:
        "WebSocket-based chat using Supabase. Scalable to thousands of users.",
      tech: ["Supabase", "Next.js", "TypeScript", "TailwindCSS"],
      link: "https://github.com/yourusername/realtime-chat",
    },
];
