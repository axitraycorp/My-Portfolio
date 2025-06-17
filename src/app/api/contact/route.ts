import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

const schema = z.object({
   name: z.string().min(2),
   email: z.string().email(),
   message: z.string().min(10),
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
   try {
      const body = await req.json();
      const data = schema.parse(body);

      const to = process.env.CONTACT_FORM_TO;

      if (!to) {
         console.error("Missing CONTACT_FORM_TO env var");
         return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
      }

      // ✉️ Send email
      await resend.emails.send({
         from: "Hagon Portfolio <onboarding@resend.dev>",
         to,
         subject: "New Message from Contact Form",
         reply_to: data.email,
         text: `
From: ${data.name}
Email: ${data.email}

Message:
${data.message}
      `,
      });

      return NextResponse.json({ success: true });
   } catch (err: any) {
      console.error("❌ Contact error", err);

      if (err instanceof z.ZodError) {
         return NextResponse.json({ error: err.errors }, { status: 400 });
      }

      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
   }
}
