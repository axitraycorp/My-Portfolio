"use client";

import { useEffect, useState } from "react";
import { graphqlRequest } from "@/lib/api";

type Skill = { id: string; name: string };

const TOKEN_KEY = "portfolio-admin-token";
const inputClass = "w-full border border-gray-300 dark:border-neutral-700 bg-transparent p-2 rounded";

const emptyForm = {
   title: "",
   description: "",
   techStack: "",
   githubUrl: "",
   liveUrl: "",
   image: "",
   skillIds: [] as string[],
};

function readStoredToken() {
   try {
      return sessionStorage.getItem(TOKEN_KEY) ?? "";
   } catch {
      return "";
   }
}

export default function NewProjectPage() {
   const [skills, setSkills] = useState<Skill[]>([]);
   const [form, setForm] = useState(emptyForm);
   const [adminToken, setAdminToken] = useState("");
   const [newSkill, setNewSkill] = useState("");
   const [status, setStatus] = useState("");

   useEffect(() => {
      setAdminToken(readStoredToken());
      graphqlRequest<{ skills: Skill[] }>(`query { skills { id name } }`)
         .then((data) => setSkills(data.skills))
         .catch((err: Error) => setStatus(`Could not load skills: ${err.message}`));
   }, []);

   const updateToken = (value: string) => {
      setAdminToken(value);
      try {
         sessionStorage.setItem(TOKEN_KEY, value);
      } catch {
         // storage unavailable (private mode); token just won't persist
      }
   };

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

   const handleAddSkill = async () => {
      if (!newSkill.trim()) return;
      try {
         const { createSkill } = await graphqlRequest<{ createSkill: Skill }>(
            `mutation CreateSkill($input: CreateSkillDto!) { createSkill(input: $input) { id name } }`,
            { variables: { input: { name: newSkill.trim() } }, adminToken }
         );
         setSkills((prev) =>
            prev.some((s) => s.id === createSkill.id)
               ? prev
               : [...prev, createSkill].sort((a, b) => a.name.localeCompare(b.name))
         );
         setForm((prev) => ({
            ...prev,
            skillIds: prev.skillIds.includes(createSkill.id)
               ? prev.skillIds
               : [...prev.skillIds, createSkill.id],
         }));
         setNewSkill("");
      } catch (err) {
         setStatus(`Error: ${(err as Error).message}`);
      }
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setStatus("Submitting...");

      // Optional URL fields must be omitted, not sent as "", to pass validation
      const input = {
         ...form,
         liveUrl: form.liveUrl || undefined,
         image: form.image || undefined,
      };

      try {
         await graphqlRequest(
            `
        mutation CreateProject($input: CreateProjectDto!) {
          createProject(input: $input) {
            id
            title
          }
        }
        `,
            { variables: { input }, adminToken }
         );

         setStatus("Project created!");
         setForm(emptyForm);
      } catch (err) {
         setStatus(`Error: ${(err as Error).message}`);
      }
   };

   return (
      <div className="max-w-xl mx-auto p-4">
         <h1 className="text-2xl mb-4">Create New Project</h1>
         <form onSubmit={handleSubmit} className="space-y-4">
            <input
               type="password"
               placeholder="Admin token"
               value={adminToken}
               onChange={(e) => updateToken(e.target.value)}
               required
               autoComplete="off"
               className={inputClass}
            />
            <input
               name="title"
               placeholder="Title"
               value={form.title}
               onChange={handleChange}
               required
               className={inputClass}
            />
            <textarea
               name="description"
               placeholder="Description"
               value={form.description}
               onChange={handleChange}
               required
               className={inputClass}
            />
            <input
               name="techStack"
               placeholder="Tech Stack (comma-separated)"
               value={form.techStack}
               onChange={handleChange}
               className={inputClass}
            />
            <input
               name="githubUrl"
               type="url"
               placeholder="GitHub URL"
               value={form.githubUrl}
               onChange={handleChange}
               required
               className={inputClass}
            />
            <input
               name="liveUrl"
               type="url"
               placeholder="Live URL (optional)"
               value={form.liveUrl}
               onChange={handleChange}
               className={inputClass}
            />
            <input
               name="image"
               type="url"
               placeholder="Image URL (optional)"
               value={form.image}
               onChange={handleChange}
               className={inputClass}
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
               <div className="flex gap-2 mt-2">
                  <input
                     placeholder="New skill"
                     value={newSkill}
                     onChange={(e) => setNewSkill(e.target.value)}
                     onKeyDown={(e) => {
                        if (e.key === "Enter") {
                           e.preventDefault();
                           handleAddSkill();
                        }
                     }}
                     className={inputClass}
                  />
                  <button type="button" onClick={handleAddSkill} className="px-3 rounded border">
                     Add
                  </button>
               </div>
            </div>

            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">
               Create Project
            </button>

            {status && <p className="mt-2">{status}</p>}
         </form>
      </div>
   );
}
