import Link from "next/link";
import FadeIn from "@/components/FadeIn";

export default function Home() {
  return (
    <section className="space-y-12 py-16">
      {/* 👋 Hero Section */}
      <FadeIn>
        <div className="space-y-4 text-center sm:text-left">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">👋 Hi, I'm Hagon</h1>
          <p className="text-lg text-gray-700 max-w-xl mx-auto sm:mx-0">
            I'm a senior full-stack developer and systems architect. I build performant frontends,
            scalable cloud-native backends, DevOps pipelines, and AI-powered tools.
          </p>
          <FadeIn delay={0.1}>
            <div className="flex gap-4 justify-center sm:justify-start mt-6">
              <Link
                href="/projects"
                className="px-4 py-2 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition"
              >
                View Projects
              </Link>
              <Link
                href="/contact"
                className="px-4 py-2 rounded-lg border border-gray-400 text-gray-800 hover:bg-gray-100 transition"
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
          <h2 className="text-2xl font-semibold">Featured Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FadeIn delay={0.1}>
              <ProjectCard
                title="Real-Time Chat App"
                description="Built with Next.js, Socket.IO, and MongoDB. Live chat, typing indicators, and user presence."
                href="/projects/chat-app"
              />
            </FadeIn>
            <FadeIn delay={0.2}>
              <ProjectCard
                title="AI Blog Generator"
                description="OpenAI + LangChain tool that transforms ideas into ready-to-publish blog posts with structure and tone control."
                href="/projects/ai-writer"
              />
            </FadeIn>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

// ✅ Reusable inline component for now
function ProjectCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block p-4 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition"
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
    </Link>
  );
}
