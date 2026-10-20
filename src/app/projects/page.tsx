import type { Metadata } from "next";
import FadeIn from "@/components/FadeIn";
import ProjectCard from "@/components/ProjectCard";
import { getProjects } from "@/data/projectData";

export const metadata: Metadata = { title: "Projects | Hagon" };

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <FadeIn>
      <section className="space-y-12 py-16">
        <h1 className="text-3xl font-bold">Projects</h1>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.title} {...project} />
          ))}
        </div>
      </section>
    </FadeIn>
  );
}
