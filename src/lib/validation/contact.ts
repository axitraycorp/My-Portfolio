import { z } from "zod";

export const ContactSchema = z.object({
   name: z.string().min(2, "Name too short"),
   email: z.string().email("Invalid email"),
   message: z.string().min(10, "Message too short"),
});
