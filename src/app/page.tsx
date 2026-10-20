import Link from "next/link";
import FadeIn from "@/components/FadeIn";
import ProjectCard from "@/components/ProjectCard";
import { getProjects } from "@/data/projectData";

export default async function Home() {
  const featured = (await getProjects()).slice(0, 2);

  return (
    <section className="space-y-12 py-16">
      {/* 👋 Hero Section */}
      <FadeIn>
        <div className="space-y-4 text-center sm:text-left">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">👋 Hi, I&apos;m Hagon</h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 max-w-xl mx-auto sm:mx-0">
            I&apos;m a senior full-stack developer and systems architect. I build performant
            frontends, scalable cloud-native backends, DevOps pipelines, and AI-powered tools.
          </p>
          <FadeIn delay={0.1}>
            <div className="flex gap-4 justify-center sm:justify-start mt-6">
              <Link
                href="/projects"
                className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition"
              >
                View Projects
              </Link>
              <Link
                href="/contact"
                className="px-4 py-2 rounded-lg border border-gray-400 dark:border-neutral-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition"
              >
                Contact Me
              </Link>
            </div>
          </FadeIn>
        </div>
      </FadeIn>

      {/* 🚀 Featured Projects Preview */}
      <FadeIn>
        <div className="space-y-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-semibold">Featured Projects</h2>
            <Link href="/projects" className="text-sm hover:underline underline-offset-4">
              All projects →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featured.map((project) => (
              <ProjectCard key={project.title} {...project} />
            ))}
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
