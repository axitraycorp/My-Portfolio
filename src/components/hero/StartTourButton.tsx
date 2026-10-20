"use client";

import { openAssistant } from "@/components/assistant/events";

export function StartTourButton() {
   return (
      <button
         type="button"
         className="btn btn-ghost"
         onClick={() => openAssistant({ mode: "tour" })}
      >
         Start the tour
      </button>
   );
}
