/** Lets any component open Unit-7 without importing the (lazy-loaded) panel. */

export type AssistantMode = "tour" | "chat";

export type OpenAssistantDetail = {
   mode?: AssistantMode;
   /** Optional message to send immediately in chat mode. */
   prompt?: string;
};

export const OPEN_EVENT = "unit7:open";

export function openAssistant(detail: OpenAssistantDetail = {}) {
   window.dispatchEvent(new CustomEvent<OpenAssistantDetail>(OPEN_EVENT, { detail }));
}
