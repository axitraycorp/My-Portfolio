/** Marks a detail that hasn't been confirmed yet (a TODO in profile.ts). */
export function Tbc({ children = "to be confirmed" }: { children?: React.ReactNode }) {
   return <span className="tbc">{children}</span>;
}
