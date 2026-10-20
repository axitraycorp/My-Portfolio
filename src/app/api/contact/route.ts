import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { ContactSchema } from "@/lib/validation/contact";
import { API_URL } from "@/lib/api";

// Best-effort copy into the backend DB; email delivery is what the visitor depends on.
async function persistToBackend(data: z.infer<typeof ContactSchema>) {
   try {
      const res = await fetch(`${API_URL}/contact`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(data),
         signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) console.error("Backend rejected contact message", res.status);
   } catch (err) {
      console.error("Could not reach backend to store contact message", err);
   }
}

export async function POST(req: Request) {
   try {
      const body = await req.json();
      const data = ContactSchema.parse(body);

      const to = process.env.CONTACT_FORM_TO;
      const apiKey = process.env.RESEND_API_KEY;

      if (!to || !apiKey) {
         console.error("Missing CONTACT_FORM_TO or RESEND_API_KEY env var");
         return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
      }

      const resend = new Resend(apiKey);

      const [{ error }] = await Promise.all([
         resend.emails.send({
            from: process.env.CONTACT_FORM_FROM ?? "Hagon Portfolio <onboarding@resend.dev>",
            to,
            subject: `New message from ${data.name}`,
            replyTo: data.email,
            text: `From: ${data.name}\nEmail: ${data.email}\n\nMessage:\n${data.message}\n`,
         }),
         persistToBackend(data),
      ]);

      if (error) {
         console.error("❌ Resend error", error);
         return NextResponse.json({ error: "Could not send message" }, { status: 502 });
      }

      return NextResponse.json({ success: true });
   } catch (err) {
      if (err instanceof z.ZodError) {
         return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
      }

      console.error("❌ Contact error", err);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
   }
}
