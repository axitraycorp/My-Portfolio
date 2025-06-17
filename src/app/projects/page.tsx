"use client";

import { withFadeIn } from "@/lib/withFadeIn";
import ProjectCard from "@/components/ProjectCard";

function ProjectsPage() {
  return (
    <section className="space-y-12 py-16">
      <h1 className="text-3xl font-bold">Projects</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <ProjectCard
          title="DevOps Dashboard"
          description="CI/CD pipelines with GitHub Actions, Docker, and Kubernetes."
          tech={["Next.js", "Docker", "K8s", "GitHub Actions"]}
          link="https://github.com/yourusername/devops-dashboard"
        />
        <ProjectCard
          title="AI SaaS Starter"
          description="OpenAI-powered SaaS starter with billing and auth."
          tech={["Next.js", "Stripe", "Clerk", "OpenAI"]}
          link="https://github.com/yourusername/ai-saas-starter"
        />
        <ProjectCard
          title="Realtime Chat App"
          description="Scalable WebSocket chat using Supabase & Next.js."
          tech={["Next.js", "Supabase", "Tailwind", "TypeScript"]}
          link="https://github.com/yourusername/realtime-chat"
        />
      </div>
    </section>
  );
}

export default withFadeIn(ProjectsPage);
