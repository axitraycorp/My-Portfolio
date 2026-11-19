"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import type { SectionId } from "@/content/profile";
import { ThemeToggle } from "@/components/hud/ThemeToggle";

type NavLink = { id: SectionId; label: string };

/** Pages that live outside the home page, shown after the section they follow. */
const PAGES: { after: SectionId; href: string; label: string }[] = [{ after: "projects", href: "/lab", label: "Lab" }];

/** Content comes from the server layout so profile.ts never ships to the browser. */
export default function Navbar({ name, links }: { name: string; links: NavLink[] }) {
   const [isOpen, setIsOpen] = useState(false);
   const pathname = usePathname() ?? "/";
   const items = links.flatMap(({ id, label }) => [
      { href: `/#${id}`, label, current: false },
      ...PAGES.filter((p) => p.after === id).map((p) => ({ href: p.href, label: p.label, current: pathname.startsWith(p.href) })),
   ]);

   useEffect(() => {
      if (!isOpen) return;
      const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
   }, [isOpen]);

   return (
      <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur supports-[not(backdrop-filter:blur(1px))]:bg-background">
         <nav
            aria-label="Main"
            className="mx-auto flex h-16 max-w-content items-center justify-between gap-s px-gutter"
         >
            <Link
               href="/"
               className="group flex items-baseline gap-2xs font-display text-lead font-semibold tracking-tight"
            >
               {name}
               <span className="font-mono text-caption font-normal text-camera transition-colors group-hover:text-lidar">
                  /unit-7
               </span>
            </Link>

            <ul className="hidden items-center gap-3xs md:flex">
               {items.map(({ href, label, current }) => (
                  <li key={href}>
                     <Link
                        href={href}
                        aria-current={current ? "page" : undefined}
                        className="rounded-hud px-xs py-2xs font-mono text-small text-muted transition-colors hover:text-ink aria-[current=page]:text-camera"
                     >
                        {label}
                     </Link>
                  </li>
               ))}
            </ul>

            <div className="flex items-center gap-2xs">
               <ThemeToggle />
               <button
                  type="button"
                  className="inline-flex size-10 items-center justify-center rounded-hud border border-line md:hidden"
                  onClick={() => setIsOpen((v) => !v)}
                  aria-expanded={isOpen}
                  aria-controls="mobile-menu"
                  aria-label={isOpen ? "Close menu" : "Open menu"}
               >
                  {isOpen ? (
                     <X className="size-5" aria-hidden="true" />
                  ) : (
                     <Menu className="size-5" aria-hidden="true" />
                  )}
               </button>
            </div>
         </nav>

         {isOpen && (
            <div id="mobile-menu" className="border-t border-line px-gutter pb-s md:hidden">
               <ul className="flex flex-col py-2xs">
                  {items.map(({ href, label, current }) => (
                     <li key={href}>
                        <Link
                           href={href}
                           aria-current={current ? "page" : undefined}
                           className="block py-xs font-mono text-body text-muted hover:text-ink"
                           onClick={() => setIsOpen(false)}
                        >
                           {label}
                        </Link>
                     </li>
                  ))}
               </ul>
            </div>
         )}
      </header>
   );
}
