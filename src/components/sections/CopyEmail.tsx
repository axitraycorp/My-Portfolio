"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Email address with a copy button. Falls back to selecting the text if the Clipboard API is unavailable. */
export function CopyEmail({ email }: { email: string }) {
   const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

   const copy = async () => {
      try {
         await navigator.clipboard.writeText(email);
         setState("copied");
      } catch {
         const el = document.getElementById("contact-email");
         if (el) {
            const range = document.createRange();
            range.selectNodeContents(el);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
         }
         setState("failed");
      }
      window.setTimeout(() => setState("idle"), 2000);
   };

   return (
      <div className="flex flex-wrap items-center gap-xs">
         <a
            id="contact-email"
            href={`mailto:${email}`}
            className="font-display text-h3 font-medium break-all hover:text-camera"
         >
            {email}
         </a>
         <button
            type="button"
            onClick={copy}
            className="btn btn-ghost min-h-10 px-xs"
            aria-label="Copy email address"
         >
            {state === "copied" ? (
               <Check className="size-4" aria-hidden="true" />
            ) : (
               <Copy className="size-4" aria-hidden="true" />
            )}
            <span>
               {state === "copied" ? "Copied" : state === "failed" ? "Press Ctrl+C" : "Copy"}
            </span>
         </button>
         <span className="sr-only" role="status" aria-live="polite">
            {state === "copied" ? "Email address copied to clipboard" : ""}
         </span>
      </div>
   );
}
