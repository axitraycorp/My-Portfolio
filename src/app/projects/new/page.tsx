"use client";

import { useEffect, useState } from "react";
import { graphqlRequest } from "@/lib/api";

export default function NewProjectPage() {
   const [skills, setSkills] = useState<any[]>([]);
   const [form, setForm] = useState({
      title: "",
      description: "",
      techStack: "",
      githubUrl: "",
      liveUrl: "",
      image: "",
      skillIds: [] as string[],
   });
   const [status, setStatus] = useState("");

   useEffect(() => {
      async function loadSkills() {
         const data = await graphqlRequest(`
        query {
          skills {
            id
            name
          }
        }
      `);
         setSkills(data.skills);
      }
      loadSkills();
   }, []);

   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm({ ...form, [e.target.name]: e.target.value });
   };

   const handleSkillToggle = (id: string) => {
      setForm((prev) => ({
         ...prev,
         skillIds: prev.skillIds.includes(id)
            ? prev.skillIds.filter((sid) => sid !== id)
            : [...prev.skillIds, id],
      }));
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setStatus("Submitting...");

      try {
         await graphqlRequest(
            `
        mutation CreateProject($input: CreateProjectInput!) {
          createProject(input: $input) {
            id
            title
          }
        }
        `,
            { input: form }
         );

         setStatus("Project created!");
         // Reset form
         setForm({
            title: "",
            description: "",
            techStack: "",
            githubUrl: "",
            liveUrl: "",
            image: "",
            skillIds: [],
         });
      } catch (err: any) {
         setStatus(`Error: ${err.message}`);
      }
   };

   return (
      <div className="max-w-xl mx-auto p-4">
         <h1 className="text-2xl mb-4">Create New Project</h1>
         <form onSubmit={handleSubmit} className="space-y-4">
            <input
               name="title"
               placeholder="Title"
               value={form.title}
               onChange={handleChange}
               required
               className="w-full border p-2 rounded"
            />
            <textarea
               name="description"
               placeholder="Description"
               value={form.description}
               onChange={handleChange}
               required
               className="w-full border p-2 rounded"
            />
            <input
               name="techStack"
               placeholder="Tech Stack"
               value={form.techStack}
               onChange={handleChange}
               className="w-full border p-2 rounded"
            />
            <input
               name="githubUrl"
               placeholder="GitHub URL"
               value={form.githubUrl}
               onChange={handleChange}
               className="w-full border p-2 rounded"
            />
            <input
               name="liveUrl"
               placeholder="Live URL"
               value={form.liveUrl}
               onChange={handleChange}
               className="w-full border p-2 rounded"
            />
            <input
               name="image"
               placeholder="Image URL"
               value={form.image}
               onChange={handleChange}
               className="w-full border p-2 rounded"
            />

            <div>
               <label className="block mb-1">Skills:</label>
               <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                     <button
                        type="button"
                        key={skill.id}
                        onClick={() => handleSkillToggle(skill.id)}
                        className={`px-2 py-1 rounded border ${
                           form.skillIds.includes(skill.id) ? "bg-blue-500 text-white" : ""
                        }`}
                     >
                        {skill.name}
                     </button>
                  ))}
               </div>
            </div>

            <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded">
               Create Project
            </button>

            {status && <p className="mt-2">{status}</p>}
         </form>
      </div>
   );
}
