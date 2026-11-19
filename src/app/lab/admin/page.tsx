import type { Metadata } from "next";
import { AdminPanel } from "@/lab/ui/AdminPanel";

export const metadata: Metadata = {
   title: "Robot Lab — admin",
   robots: { index: false },
};

export default function AdminPage() {
   return (
      <div className="mx-auto flex max-w-content flex-col gap-m px-gutter py-xl">
         <h1 className="text-h2 font-semibold">Lab accounts</h1>
         <p className="max-w-[65ch] text-small text-muted">
            Only you can create accounts. Each new account gets a one-time password, shown once — send it to the person privately. They are
            asked to choose their own password on first sign-in.
         </p>
         <AdminPanel />
      </div>
   );
}
