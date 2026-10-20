"use client";

import { useState } from "react";

const inputClass =
   "w-full border border-gray-300 dark:border-neutral-700 bg-transparent rounded-lg p-2 mt-1";

export function ContactForm() {
   const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
   const [error, setError] = useState<string | null>(null);

   async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      setStatus("loading");
      setError(null);

      const form = e.currentTarget;
      const formData = new FormData(form);

      const payload = {
         name: formData.get("name"),
         email: formData.get("email"),
         message: formData.get("message"),
      };

      try {
         const res = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
         });

         if (res.ok) {
            setStatus("success");
            form.reset();
         } else {
            const { error } = await res.json().catch(() => ({ error: null }));
            setError(error ?? "Something went wrong");
            setStatus("error");
         }
      } catch {
         setError("Network error, please try again");
         setStatus("error");
      }
   }

   return (
      <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
         <div>
            <label htmlFor="name" className="block font-medium">
               Name
            </label>
            <input required minLength={2} name="name" id="name" type="text" className={inputClass} />
         </div>

         <div>
            <label htmlFor="email" className="block font-medium">
               Email
            </label>
            <input required name="email" id="email" type="email" className={inputClass} />
         </div>

         <div>
            <label htmlFor="message" className="block font-medium">
               Message
            </label>
            <textarea
               required
               minLength={10}
               name="message"
               id="message"
               rows={5}
               className={inputClass}
            />
         </div>

         <button
            type="submit"
            className="bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition disabled:opacity-60"
            disabled={status === "loading"}
         >
            {status === "loading" ? "Sending..." : "Send Message"}
         </button>

         {status === "success" && (
            <p className="text-green-600 font-medium">Thanks! Your message has been sent.</p>
         )}
         {status === "error" && <p className="text-red-600 font-medium">Error: {error}</p>}
      </form>
   );
}
