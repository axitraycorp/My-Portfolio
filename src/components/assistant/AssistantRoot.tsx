"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { OPEN_EVENT, type OpenAssistantDetail } from "./events";

const loadPanel = () => import("./AssistantPanel");
const AssistantPanel = dynamic(loadPanel, { ssr: false, loading: () => null });

/**
 * Floating launcher + lazily loaded Unit-7 panel. The panel's code is only
 * fetched on first open (prefetched on hover/focus), so it never affects the
 * first render. Once mounted it stays mounted (hidden) to keep the conversation.
 */
export function AssistantRoot() {
   const launcherRef = useRef<HTMLButtonElement>(null);
   /** Element that opened the panel; focus returns there on close. */
   const openerRef = useRef<HTMLElement | null>(null);
   const [open, setOpen] = useState(false);
   const [mounted, setMounted] = useState(false);
   const [request, setRequest] = useState<(OpenAssistantDetail & { id: number }) | null>(null);

   useEffect(() => {
      const onOpen = (e: Event) => {
         const detail = (e as CustomEvent<OpenAssistantDetail>).detail ?? {};
         openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
         setMounted(true);
         setOpen(true);
         setRequest({ ...detail, id: Date.now() });
      };
      window.addEventListener(OPEN_EVENT, onOpen);
      return () => window.removeEventListener(OPEN_EVENT, onOpen);
   }, []);

   const close = useCallback(() => {
      setOpen(false);
      // After re-render: on phones the launcher is hidden while the panel is open
      requestAnimationFrame(() => {
         const opener = openerRef.current;
         const target = opener && opener.isConnected && opener.offsetParent !== null ? opener : launcherRef.current;
         target?.focus();
         openerRef.current = null;
      });
   }, []);

   return (
      <>
         <button
            ref={launcherRef}
            type="button"
            className="assistant-launcher"
            data-open={open ? "" : undefined}
            aria-label={open ? "Close Unit-7, the site guide" : "Open Unit-7, the site guide"}
            aria-expanded={open}
            aria-controls={mounted ? "unit7-panel" : undefined}
            aria-haspopup="dialog"
            onPointerEnter={() => void loadPanel()}
            onFocus={() => void loadPanel()}
            onClick={() => {
               if (open) close();
               else {
                  setMounted(true);
                  setOpen(true);
               }
            }}
         >
            <span className="assistant-launcher__ring" aria-hidden="true" />
            <span className="assistant-launcher__eye" aria-hidden="true">
               <span className="assistant-launcher__pupil" />
            </span>
         </button>
         {mounted && <AssistantPanel open={open} onClose={close} request={request} />}
      </>
   );
}
