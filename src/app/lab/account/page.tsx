import type { Metadata } from "next";
import { AccountPanel } from "@/lab/ui/AccountPanel";

export const metadata: Metadata = {
   title: "Robot Lab — account",
   robots: { index: false },
};

export default function AccountPage() {
   return (
      <div className="mx-auto flex max-w-[36rem] flex-col gap-m px-gutter py-2xl">
         <h1 className="text-h2 font-semibold">Your lab account</h1>
         <AccountPanel />
      </div>
   );
}
