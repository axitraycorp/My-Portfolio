"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

/*
 * Client-side navigation wrapped in the View Transitions API. The transition's
 * update callback waits until the new route has rendered (pathname changed),
 * so elements sharing a `view-transition-name` morph between pages.
 */

let finishPending: (() => void) | null = null;

/** Mount once (in the root layout) to complete pending transitions after navigation. */
export function ViewTransitionListener() {
   const pathname = usePathname();
   useEffect(() => {
      finishPending?.();
      finishPending = null;
   }, [pathname]);
   return null;
}

function canTransition() {
   return (
      typeof document !== "undefined" &&
      typeof document.startViewTransition === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
   );
}

export function useTransitionNavigate() {
   const router = useRouter();
   return useCallback(
      (href: string) => {
         const samePath = href.split("#")[0] === window.location.pathname;
         if (!canTransition() || samePath) {
            router.push(href);
            return;
         }
         document.startViewTransition(
            () =>
               new Promise<void>((resolve) => {
                  finishPending = resolve;
                  router.push(href);
                  // Never hold the page frozen if navigation stalls
                  setTimeout(resolve, 2000);
               })
         );
      },
      [router]
   );
}

type TransitionLinkProps = Omit<React.ComponentProps<typeof Link>, "href"> & { href: string };

/** Drop-in <Link> that navigates with a view transition (plain navigation as fallback). */
export function TransitionLink({ href, onClick, ...rest }: TransitionLinkProps) {
   const navigate = useTransitionNavigate();
   return (
      <Link
         href={href}
         onClick={(event) => {
            onClick?.(event);
            if (
               event.defaultPrevented ||
               event.button !== 0 ||
               event.metaKey ||
               event.ctrlKey ||
               event.shiftKey ||
               event.altKey ||
               rest.target === "_blank"
            ) {
               return;
            }
            event.preventDefault();
            navigate(href);
         }}
         {...rest}
      />
   );
}
