import type { Metadata } from "next";
import { LoginForm } from "@/lab/ui/LoginForm";

export const metadata: Metadata = {
   title: "Robot Lab — sign in",
   robots: { index: false },
};

export default function LoginPage() {
   return (
      <div className="mx-auto flex max-w-[28rem] flex-col gap-m px-gutter py-2xl">
         <h1 className="text-h2 font-semibold">Sign in to the lab</h1>
         <p className="text-small text-muted">
            Accounts are by invitation only — there is no public sign-up. If you need access, more build slots or more advisor reviews,
            contact the site owner.
         </p>
         <LoginForm />
      </div>
   );
}
