"use client";

import { useState } from "react";

const inputClass =
   "mt-3xs w-full rounded-hud border border-line bg-background px-xs py-2xs text-ink transition-colors placeholder:text-muted focus:border-camera focus:outline-none focus-visible:shadow-[var(--glow)]";

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
      <form onSubmit={handleSubmit} className="flex flex-col gap-s">
         <div>
            <label htmlFor="name" className="mono-caps">
               Name
            </label>
            <input
               required
               minLength={2}
               name="name"
               id="name"
               type="text"
               autoComplete="name"
               className={inputClass}
            />
         </div>

         <div>
            <label htmlFor="email" className="mono-caps">
               Email
            </label>
            <input
               required
               name="email"
               id="email"
               type="email"
               autoComplete="email"
               className={inputClass}
            />
         </div>

         <div>
            <label htmlFor="message" className="mono-caps">
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
            className="btn btn-primary self-start"
            disabled={status === "loading"}
         >
            {status === "loading" ? "Transmitting..." : "Send message"}
         </button>

         <div role="status" aria-live="polite">
            {status === "success" && (
               <p className="font-mono text-small text-success">Message received. Thanks!</p>
            )}
            {status === "error" && (
               <p className="font-mono text-small text-warning">Error: {error}</p>
            )}
         </div>
      </form>
   );
}
