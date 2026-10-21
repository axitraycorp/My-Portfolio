"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, Send, X } from "lucide-react";
import clsx from "clsx";
import type { TourStep } from "@/content/profile";
import { TopicLabel } from "@/components/hud/TopicLabel";
import { useTransitionNavigate } from "@/lib/view-transition";
import type { ToolCall } from "@/lib/assistant/tool-schemas";
import { MAX_USER_MESSAGE_CHARS } from "@/lib/assistant/validation";
import type { AssistantMode, OpenAssistantDetail } from "./events";
import { runTool, type Highlight, type ToolContext } from "./run-tool";
import { Spotlight } from "./Spotlight";
import { useAssistantChat } from "./useAssistantChat";

const TOUR_CHIP = "Give me the tour";
const STARTERS = [
   TOUR_CHIP,
   "What's special about the robot?",
   "Why hire someone from hotel management?",
];

const FOCUSABLE =
   'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Props = {
   open: boolean;
   onClose: () => void;
   request: (OpenAssistantDetail & { id: number }) | null;
   /** Passed from the server so profile.ts never ships in the client bundle. */
   tourSteps: TourStep[];
};

/** Element highlighted for a tour step: its explicit target, else the section heading. */
function tourTarget(step: TourStep): Highlight {
   return { elementId: step.highlight ?? `${step.sectionId}-title`, label: step.title };
}

export default function AssistantPanel({ open, onClose, request, tourSteps }: Props) {
   const panelRef = useRef<HTMLDivElement>(null);
   const inputRef = useRef<HTMLTextAreaElement>(null);
   const pathname = usePathname();
   const navigate = useTransitionNavigate();

   const [mode, setMode] = useState<AssistantMode>("chat");
   const [offline, setOffline] = useState(false);
   const [step, setStep] = useState(0);
   const [highlight, setHighlight] = useState<Highlight | null>(null);
   const [suggestions, setSuggestions] = useState<string[]>([]);
   const [draft, setDraft] = useState("");

   const ctxRef = useRef<ToolContext>({ navigate, pathname, setHighlight, setSuggestions });
   ctxRef.current = { navigate, pathname, setHighlight, setSuggestions };

   const onTool = useCallback((call: ToolCall) => {
      if (call.name === "suggest_questions") setSuggestions(call.input.questions);
      else void runTool(call, ctxRef.current);
   }, []);

   const goToStep = useCallback(
      (index: number) => {
         const clamped = Math.max(0, Math.min(tourSteps.length - 1, index));
         setStep(clamped);
         const target = tourTarget(tourSteps[clamped]);
         void runTool({ name: "highlight_element", input: target }, ctxRef.current);
      },
      [tourSteps]
   );

   const startTour = useCallback(
      (from = 0) => {
         setMode("tour");
         setSuggestions([]);
         goToStep(from);
      },
      [goToStep]
   );

   const onOffline = useCallback(() => {
      setOffline(true);
      startTour(0);
   }, [startTour]);

   const { messages, busy, waiting, send, stop } = useAssistantChat({ onTool, onOffline });

   const submit = (text: string) => {
      if (text === TOUR_CHIP) {
         startTour(0);
         return;
      }
      setSuggestions([]);
      setDraft("");
      void send(text);
   };

   const exitTour = () => {
      setHighlight(null);
      if (offline) onClose();
      else setMode("chat");
   };

   const switchMode = (next: AssistantMode) => {
      if (next === mode) return;
      if (next === "tour") startTour(step);
      else {
         setHighlight(null);
         setMode("chat");
      }
   };

   // Handle open requests (e.g. the hero's "Start the tour" button)
   useEffect(() => {
      if (!request) return;
      if (request.mode === "tour") startTour(0);
      else if (request.prompt && !offline) {
         setMode("chat");
         void send(request.prompt);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per request id
   }, [request?.id]);

   // Closing clears the spotlight and stops any stream
   useEffect(() => {
      if (open) return;
      setHighlight(null);
      stop();
   }, [open, stop]);

   // Initial focus when opened or when the mode changes
   useEffect(() => {
      if (!open) return;
      const id = requestAnimationFrame(() => {
         const panel = panelRef.current;
         if (!panel) return;
         const target =
            mode === "chat"
               ? inputRef.current
               : (panel.querySelector<HTMLElement>("[data-tour-next]") ??
                 panel.querySelector<HTMLElement>(FOCUSABLE));
         target?.focus();
      });
      return () => cancelAnimationFrame(id);
   }, [open, mode]);

   // Arrow keys step through the tour (unless typing)
   useEffect(() => {
      if (!open || mode !== "tour") return;
      const onKey = (e: KeyboardEvent) => {
         const el = e.target as HTMLElement | null;
         if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.isContentEditable))
            return;
         if (e.key === "ArrowRight") {
            e.preventDefault();
            goToStep(step + 1);
         } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            goToStep(step - 1);
         }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
   }, [open, mode, step, goToStep]);

   // Escape closes; Tab is trapped inside the panel
   const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
         e.stopPropagation();
         onClose();
         return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(
         panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
         e.preventDefault();
         last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
         e.preventDefault();
         first.focus();
      }
   };

   const current = tourSteps[step];
   const status = offline ? "offline mode" : busy ? "processing" : "online";
   const chips = messages.length === 0 ? STARTERS : suggestions;

   return (
      <>
         {open && <Spotlight highlight={highlight} />}
         <div
            ref={panelRef}
            id="unit7-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="unit7-title"
            hidden={!open}
            className="assistant-panel hud-frame"
            data-channel="fused"
            onKeyDown={onKeyDown}
         >
            <header className="assistant-panel__header">
               <div className="min-w-0">
                  <h2 id="unit7-title" className="font-display text-lead font-semibold">
                     Unit-7
                  </h2>
                  <TopicLabel topic="/unit-7/status" channel={offline ? "lidar" : "fused"}>
                     {status}
                  </TopicLabel>
               </div>
               <div className="assistant-mode" role="group" aria-label="Assistant mode">
                  {(["tour", "chat"] as const).map((m) => (
                     <button
                        key={m}
                        type="button"
                        aria-pressed={mode === m}
                        disabled={m === "chat" && offline}
                        title={
                           m === "chat" && offline
                              ? "Chat is offline — the scripted tour still works"
                              : undefined
                        }
                        onClick={() => switchMode(m)}
                     >
                        {m === "tour" ? "Tour" : "Chat"}
                     </button>
                  ))}
               </div>
               <button
                  type="button"
                  className="assistant-icon-btn"
                  onClick={onClose}
                  aria-label="Close Unit-7"
               >
                  <X className="size-4" aria-hidden="true" />
               </button>
            </header>

            {offline && (
               <p className="assistant-note" role="status">
                  offline mode · scripted tour
               </p>
            )}

            {mode === "chat" ? (
               <>
                  <div
                     className="assistant-log"
                     role="log"
                     aria-live="polite"
                     aria-label="Conversation with Unit-7"
                  >
                     {messages.length === 0 && (
                        <p className="assistant-msg" data-role="assistant">
                           Hi, I&apos;m Unit-7, the robot&apos;s onboard AI. Ask me anything about
                           this portfolio, or take the tour.
                        </p>
                     )}
                     {messages.map((m) =>
                        m.text || m.role === "user" ? (
                           <p key={m.id} className="assistant-msg" data-role={m.role}>
                              <span className="sr-only">
                                 {m.role === "user" ? "You: " : "Unit-7: "}
                              </span>
                              {m.text}
                           </p>
                        ) : null
                     )}
                     {waiting && (
                        <div
                           className="assistant-scan"
                           role="status"
                           aria-label="Unit-7 is thinking"
                        >
                           <span />
                        </div>
                     )}
                  </div>

                  {chips.length > 0 && !busy && (
                     <ul className="assistant-chips" aria-label="Suggested questions">
                        {chips.map((q) => (
                           <li key={q}>
                              <button type="button" onClick={() => submit(q)}>
                                 {q}
                              </button>
                           </li>
                        ))}
                     </ul>
                  )}

                  <form
                     className="assistant-form"
                     onSubmit={(e) => {
                        e.preventDefault();
                        submit(draft);
                     }}
                  >
                     <label htmlFor="unit7-input" className="sr-only">
                        Ask Unit-7
                     </label>
                     <textarea
                        id="unit7-input"
                        ref={inputRef}
                        rows={2}
                        maxLength={MAX_USER_MESSAGE_CHARS}
                        value={draft}
                        placeholder="Ask about the robot, projects, experience…"
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                           if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              submit(draft);
                           }
                        }}
                     />
                     <div className="assistant-form__row">
                        <span className="font-mono text-caption text-muted" aria-live="off">
                           {draft.length}/{MAX_USER_MESSAGE_CHARS}
                        </span>
                        <button
                           type="submit"
                           className="btn btn-primary min-h-9 px-xs"
                           disabled={busy || !draft.trim()}
                        >
                           <Send className="size-4" aria-hidden="true" /> Send
                        </button>
                     </div>
                  </form>
               </>
            ) : (
               <div className="assistant-tour">
                  <div aria-live="polite" aria-atomic="true">
                     <p className="mono-caps">
                        Step {step + 1} of {tourSteps.length}
                     </p>
                     <h3 className="mt-3xs font-display text-h3 font-medium">{current.title}</h3>
                     <p className="assistant-msg mt-xs" data-role="assistant">
                        {current.narration}
                     </p>
                  </div>
                  <div className="assistant-progress" aria-hidden="true">
                     <span style={{ width: `${((step + 1) / tourSteps.length) * 100}%` }} />
                  </div>
                  <div className="assistant-tour__controls">
                     <button
                        type="button"
                        className="btn btn-ghost min-h-9 px-xs"
                        onClick={() => goToStep(step - 1)}
                        disabled={step === 0}
                     >
                        <ArrowLeft className="size-4" aria-hidden="true" /> Back
                     </button>
                     {step < tourSteps.length - 1 ? (
                        <button
                           type="button"
                           data-tour-next
                           className="btn btn-primary min-h-9 px-xs"
                           onClick={() => goToStep(step + 1)}
                        >
                           Next <ArrowRight className="size-4" aria-hidden="true" />
                        </button>
                     ) : (
                        <button
                           type="button"
                           data-tour-next
                           className="btn btn-primary min-h-9 px-xs"
                           onClick={exitTour}
                        >
                           Finish
                        </button>
                     )}
                     <button
                        type="button"
                        className={clsx("btn btn-ghost min-h-9 px-xs", "ml-auto")}
                        onClick={exitTour}
                     >
                        Exit
                     </button>
                  </div>
                  <p className="font-mono text-caption text-muted">Tip: use ← → keys</p>
               </div>
            )}
         </div>
      </>
   );
}
