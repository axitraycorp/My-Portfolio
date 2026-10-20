"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import clsx from "clsx";
import { currentTheme, saveTheme, type Theme } from "@/lib/theme";

function applyTheme(theme: Theme) {
   document.documentElement.dataset.theme = theme;
   saveTheme(theme);
}

/**
 * Switches theme with a circular reveal from the button (View Transitions API).
 * Falls back to an instant switch when the API is missing or motion is reduced.
 */
export function ThemeToggle({ className }: { className?: string }) {
   const [theme, setTheme] = useState<Theme | null>(null);

   useEffect(() => setTheme(currentTheme()), []);

   const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
      const next: Theme = currentTheme() === "dark" ? "light" : "dark";
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!document.startViewTransition || reduce) {
         applyTheme(next);
         setTheme(next);
         return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

      const root = document.documentElement;
      root.classList.add("theme-transition");
      const transition = document.startViewTransition(() => {
         applyTheme(next);
         setTheme(next);
      });
      transition.ready
         .then(() => {
            root.animate(
               {
                  clipPath: [
                     `circle(0px at ${x}px ${y}px)`,
                     `circle(${radius}px at ${x}px ${y}px)`,
                  ],
               },
               {
                  duration: 480,
                  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                  pseudoElement: "::view-transition-new(root)",
               }
            );
         })
         .catch(() => {});
      transition.finished.finally(() => root.classList.remove("theme-transition"));
   };

   const label = theme === "light" ? "Switch to dark theme" : "Switch to light theme";

   return (
      <button
         type="button"
         onClick={toggle}
         aria-label={label}
         title={label}
         className={clsx(
            "inline-flex size-10 items-center justify-center rounded-hud border border-line text-ink transition-colors hover:border-camera hover:text-camera",
            className
         )}
      >
         {/* Render both icons until mounted so SSR markup matches */}
         <Sun
            className={clsx("size-4", theme === "dark" && "hidden", theme === null && "hidden")}
            aria-hidden="true"
         />
         <Moon className={clsx("size-4", theme === "light" && "hidden")} aria-hidden="true" />
      </button>
   );
}
