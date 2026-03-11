import { z } from "zod";

export const rsvpFormSchema = z.object({
  attending: z.enum(["yes", "no", "maybe"], {
    required_error: "Please let us know if you can attend",
  }),
  number_of_guests: z.number().min(1, "At least 1 guest required"),
  message: z.string().max(1000, "Message is too long").optional(),
});

export type RSVPFormValues = z.infer<typeof rsvpFormSchema>;

export const manualRsvpSchema = z.object({
  full_name: z.string().min(2, "Please enter your full name").max(100),
  attending: z.enum(["yes", "no", "maybe"], {
    required_error: "Please let us know if you can attend",
  }),
  number_of_guests: z.number().min(1, "At least 1 guest required").max(10),
  message: z.string().max(1000, "Message is too long").optional(),
});

export type ManualRsvpValues = z.infer<typeof manualRsvpSchema>;

export const inviteCodeSchema = z.object({
  invite_code: z.string().min(1, "Please enter your invite code"),
});

export type InviteCodeValues = z.infer<typeof inviteCodeSchema>;
