"use client";

import { withFadeIn } from "@/lib/withFadeIn";

function AboutPage() {
  return (
    <section className="space-y-12 py-16">
      <h1 className="text-3xl font-bold">About Me</h1>

      <p className="text-lg text-gray-700 max-w-3xl leading-relaxed">
        I’m Hagon, a senior full-stack developer with a strong foundation in scalable system
        architecture, modern frontend design, and DevOps automation. I’ve built and led complex
        web platforms, integrated AI tools, and deployed globally distributed systems.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Technical Focus</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>Full-stack JavaScript (Next.js, Node.js)</li>
            <li>CI/CD & Cloud Infrastructure (AWS, Docker, GitHub Actions)</li>
            <li>TypeScript, Tailwind, and scalable component design</li>
            <li>AI Integration (OpenAI, LangChain)</li>
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Experience</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>10+ years building and deploying full-stack applications</li>
            <li>Lead developer & architect on cross-functional teams</li>
            <li>Proven success with SaaS, mobile, and eCommerce platforms</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export default withFadeIn(AboutPage);
