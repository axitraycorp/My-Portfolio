"use client";

import { motion } from "framer-motion";

type ProjectCardProps = {
  title: string;
  description: string;
  tech: string[];
  link: string;
};

export default function ProjectCard({
  title,
  description,
  tech,
  link,
}: ProjectCardProps) {
  return (
    <motion.a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-all flex flex-col gap-3 bg-white dark:bg-[#111]"
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      viewport={{ once: true }}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
      <ul className="flex flex-wrap gap-2 mt-2 text-xs text-white">
        {tech.map((t) => (
          <li
            key={t}
            className="bg-black/80 dark:bg-white/10 px-2 py-1 rounded-full"
          >
            {t}
          </li>
        ))}
      </ul>
    </motion.a>
  );
}
