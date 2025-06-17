import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handleContactSubmission(data: {
   name: string;
   email: string;
   message: string;
}) {
   const to = process.env.CONTACT_FORM_TO;
   const from = "onboarding@resend.dev"; // You can change this to a verified sender later

   return await resend.emails.send({
      to,
      from,
      subject: `New Contact Form Message from ${data.name}`,
      reply_to: data.email,
      html: `
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Message:</strong></p>
      <p>${data.message}</p>
    `,
   });
}
