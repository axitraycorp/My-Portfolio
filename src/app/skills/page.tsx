"use client";

import { withFadeIn } from "@/lib/withFadeIn";

function SkillsPage() {
  return (
    <section className="space-y-12 py-16">
      <h1 className="text-3xl font-bold">Skills</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <SkillGroup
          title="Frontend"
          skills={["React", "Next.js", "Tailwind CSS", "TypeScript"]}
        />
        <SkillGroup
          title="Backend"
          skills={["Node.js", "Express", "PostgreSQL", "MongoDB"]}
        />
        <SkillGroup
          title="DevOps & Cloud"
          skills={["Docker", "Kubernetes", "GitHub Actions", "AWS", "Vercel"]}
        />
        <SkillGroup
          title="Mobile"
          skills={["React Native", "Expo"]}
        />
        <SkillGroup
          title="AI/ML"
          skills={["OpenAI API", "LangChain", "Pinecone"]}
        />
        <SkillGroup
          title="Other"
          skills={["GraphQL", "Prisma", "tRPC", "Jest"]}
        />
      </div>
    </section>
  );
}

function SkillGroup({ title, skills }: { title: string; skills: string[] }) {
  return (
    <div className="p-4 border border-gray-200 rounded-xl shadow-sm dark:border-neutral-800">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
        {skills.map((skill) => (
          <li key={skill}>• {skill}</li>
        ))}
      </ul>
    </div>
  );
}

export default withFadeIn(SkillsPage);
