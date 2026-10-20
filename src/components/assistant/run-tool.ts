import type { ToolCall } from "@/lib/assistant/tool-schemas";

export type Highlight = {
   elementId: string;
   label: string;
};

export type ToolContext = {
   navigate: (href: string) => void;
   pathname: string;
   setHighlight: (h: Highlight | null) => void;
   setSuggestions: (questions: string[]) => void;
};

function reducedMotion() {
   return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Resolves when an element with the id exists (e.g. after navigating home), or null after the timeout. */
export function waitForElement(id: string, timeout = 4000): Promise<HTMLElement | null> {
   return new Promise((resolve) => {
      const start = performance.now();
      const check = () => {
         const el = document.getElementById(id);
         if (el) return resolve(el);
         if (performance.now() - start > timeout) return resolve(null);
         window.setTimeout(check, 80);
      };
      check();
   });
}

/** Gets an element that lives on the home page, navigating there first if needed. */
async function homeElement(id: string, ctx: ToolContext): Promise<HTMLElement | null> {
   const existing = document.getElementById(id);
   if (existing) return existing;
   if (ctx.pathname !== "/") ctx.navigate("/");
   return waitForElement(id);
}

export function scrollToElement(el: HTMLElement, block: ScrollLogicalPosition = "start") {
   el.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block });
}

/** Runs a validated tool call on the page. Never throws: a missing target is simply skipped. */
export async function runTool(call: ToolCall, ctx: ToolContext): Promise<void> {
   try {
      switch (call.name) {
         case "scroll_to_section": {
            const el = await homeElement(call.input.sectionId, ctx);
            if (el) scrollToElement(el);
            return;
         }
         case "highlight_element": {
            const el = await homeElement(call.input.elementId, ctx);
            if (!el) return;
            scrollToElement(el, "center");
            ctx.setHighlight({ elementId: call.input.elementId, label: call.input.label });
            return;
         }
         case "open_project": {
            ctx.setHighlight(null);
            ctx.navigate(`/projects/${call.input.slug}`);
            return;
         }
         case "show_metric": {
            const row = await homeElement(`metric-${call.input.metricId}`, ctx);
            if (!row) return;
            scrollToElement(row, "center");
            row.removeAttribute("data-pulse");
            // Force reflow so the animation restarts on repeat calls
            void row.offsetWidth;
            row.setAttribute("data-pulse", "");
            window.setTimeout(() => row.removeAttribute("data-pulse"), 2600);
            return;
         }
         case "suggest_questions": {
            ctx.setSuggestions(call.input.questions);
            return;
         }
      }
   } catch {
      // A failed page action must never break the assistant
   }
}
