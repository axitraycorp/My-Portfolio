"use client";

import { Download } from "lucide-react";

/** Opens the browser's print dialog; the print stylesheet lays the CV out as a clean PDF. */
export function PrintButton() {
   return (
      <button type="button" className="btn btn-primary" onClick={() => window.print()}>
         <Download className="size-4" aria-hidden="true" /> Download PDF
      </button>
   );
}
