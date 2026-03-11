import { z } from "zod";

export const manualRsvpSchema = z.object({
  full_name: z.string().min(2, "Please enter your full name").max(100),
  attending: z.enum(["yes", "no", "maybe"], {
    required_error: "Please let us know if you can attend",
  }),
  number_of_guests: z.number().min(1, "At least 1 guest required").max(10),
  message: z.string().max(1000, "Message is too long").optional(),
});

export type ManualRsvpValues = z.infer<typeof manualRsvpSchema>;
