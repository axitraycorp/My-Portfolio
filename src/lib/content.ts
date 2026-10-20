/**
 * Public-facing text helpers. Content may contain "TODO:" placeholders; these
 * must never reach visitors (or the assistant) as if they were facts.
 */

/** Returns the text with any "(TODO: …)" asides removed, or null if the whole value is a TODO. */
export function publicText(value: string | null | undefined): string | null {
   if (!value) return null;
   if (value.trim().startsWith("TODO:")) return null;
   const cleaned = value.replace(/\s*\(TODO:[^)]*\)/g, "").trim();
   return cleaned || null;
}

/** Drops TODO entries from a list. */
export function publicList(values: string[]): string[] {
   return values.map(publicText).filter((v): v is string => v !== null);
}

export function formatYears(start: number, end: number | "present"): string {
   return `${start}–${end === "present" ? "present" : end}`;
}
