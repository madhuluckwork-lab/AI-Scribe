import { z } from "zod";

export const shareNoteSchema = z.object({
  noteId: z.string().min(1),
  patientEmail: z.string().email("Invalid email address"),
  message: z.string().max(500).optional(),
});

export type ShareNoteInput = z.infer<typeof shareNoteSchema>;
