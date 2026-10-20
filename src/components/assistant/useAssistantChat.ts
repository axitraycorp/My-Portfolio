"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StreamEvent } from "@/lib/assistant/protocol";
import { parseToolCallClient, type ToolCall } from "@/lib/assistant/tool-schemas";
import { MAX_HISTORY, MAX_USER_MESSAGE_CHARS } from "@/lib/assistant/validation";

export type UiMessage = {
   id: string;
   role: "user" | "assistant";
   text: string;
};

const REFUSED_TEXT =
   "That's outside what I can help with. Ask me about the robot, the projects or the hotel-to-robotics story.";

let counter = 0;
const nextId = () => `m${Date.now().toString(36)}${(counter++).toString(36)}`;

/**
 * Streams replies from /api/assistant. Tool calls are re-validated client-side
 * and handed to `onTool`. Any failure (network, 429, 5xx, upstream error event)
 * calls `onOffline` so the UI can switch to the scripted tour.
 */
export function useAssistantChat({
   onTool,
   onOffline,
}: {
   onTool: (call: ToolCall) => void;
   onOffline: () => void;
}) {
   const [messages, setMessages] = useState<UiMessage[]>([]);
   const [busy, setBusy] = useState(false);
   const [waiting, setWaiting] = useState(false);
   const messagesRef = useRef<UiMessage[]>([]);
   const abortRef = useRef<AbortController | null>(null);

   useEffect(() => {
      messagesRef.current = messages;
   }, [messages]);

   useEffect(() => () => abortRef.current?.abort(), []);

   const appendToAssistant = useCallback((id: string, text: string) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: m.text + text } : m)));
   }, []);

   const send = useCallback(
      async (raw: string) => {
         const text = raw.trim().slice(0, MAX_USER_MESSAGE_CHARS);
         if (!text || abortRef.current) return;

         const user: UiMessage = { id: nextId(), role: "user", text };
         const assistant: UiMessage = { id: nextId(), role: "assistant", text: "" };
         const history = [...messagesRef.current, user]
            .filter((m) => m.text.trim())
            .slice(-MAX_HISTORY)
            .map((m) => ({ role: m.role, content: m.text }));
         while (history.length && history[0].role !== "user") history.shift();

         setMessages((prev) => [...prev, user, assistant]);
         setBusy(true);
         setWaiting(true);

         const controller = new AbortController();
         abortRef.current = controller;
         let failed = false;

         const handle = (event: StreamEvent) => {
            switch (event.type) {
               case "text":
                  setWaiting(false);
                  appendToAssistant(assistant.id, event.text);
                  break;
               case "tool": {
                  const call = parseToolCallClient(event.call.name, event.call.input);
                  if (call) onTool(call);
                  break;
               }
               case "error":
                  if (event.reason === "refused") appendToAssistant(assistant.id, REFUSED_TEXT);
                  else failed = true;
                  break;
               case "done":
                  break;
            }
         };

         try {
            const res = await fetch("/api/assistant", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ messages: history }),
               signal: controller.signal,
            });

            if (res.status === 400) {
               const body = (await res.json().catch(() => ({}))) as { message?: string };
               appendToAssistant(
                  assistant.id,
                  body.message ?? "I couldn't read that message. Try rephrasing?"
               );
               return;
            }
            if (!res.ok || !res.body) {
               failed = true;
               return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            for (;;) {
               const { value, done } = await reader.read();
               if (done) break;
               buffer += decoder.decode(value, { stream: true });
               let newline: number;
               while ((newline = buffer.indexOf("\n")) >= 0) {
                  const line = buffer.slice(0, newline).trim();
                  buffer = buffer.slice(newline + 1);
                  if (!line) continue;
                  try {
                     handle(JSON.parse(line) as StreamEvent);
                  } catch {
                     // Ignore a malformed line rather than breaking the conversation
                  }
               }
            }
         } catch (err) {
            if ((err as Error).name !== "AbortError") failed = true;
         } finally {
            abortRef.current = null;
            setBusy(false);
            setWaiting(false);
            if (failed) {
               // Drop an empty reply bubble; keep any partial text that did arrive
               setMessages((prev) =>
                  prev.filter((m) => !(m.id === assistant.id && !m.text.trim()))
               );
               onOffline();
            }
         }
      },
      [appendToAssistant, onOffline, onTool]
   );

   const stop = useCallback(() => abortRef.current?.abort(), []);

   return { messages, busy, waiting, send, stop };
}
