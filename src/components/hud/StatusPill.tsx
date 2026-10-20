import clsx from "clsx";
import type { Status } from "@/content/profile";

const LABELS: Record<Status, string> = {
   done: "Done",
   active: "In progress",
   planned: "Planned",
};

export function StatusPill({ status, className }: { status: Status; className?: string }) {
   return (
      <span className={clsx("status-pill", className)} data-status={status}>
         <span className="status-pill__dot" aria-hidden="true" />
         {LABELS[status]}
      </span>
   );
}
