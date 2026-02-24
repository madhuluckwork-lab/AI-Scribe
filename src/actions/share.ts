"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendNoteShareInvite } from "@/lib/email";
import { shareNoteSchema, type ShareNoteInput } from "@/lib/validations/share";
import { revalidatePath } from "next/cache";

export async function shareNoteAction(values: ShareNoteInput) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const validated = shareNoteSchema.safeParse(values);
  if (!validated.success) return { error: "Invalid fields" };

  const { noteId, patientEmail, message } = validated.data;

  // Verify the clinician owns this note
  const note = await prisma.clinicalNote.findUnique({
    where: { id: noteId },
    select: { id: true, userId: true, title: true },
  });

  if (!note || note.userId !== session.user.id) {
    return { error: "Note not found" };
  }

  // Check if patient already has an account
  const existingPatient = await prisma.user.findUnique({
    where: { email: patientEmail },
  });

  if (existingPatient) {
    // If this note is already shared with this patient, return early
    const existingShare = await prisma.noteShare.findUnique({
      where: {
        noteId_patientId: { noteId, patientId: existingPatient.id },
      },
    });
    if (existingShare) {
      return { error: "Note is already shared with this patient" };
    }

    // Create NoteShare directly (patient already exists)
    await prisma.noteShare.create({
      data: {
        noteId,
        patientId: existingPatient.id,
        sharedById: session.user.id,
        message,
      },
    });
  }

  // Create invite + send email
  const invite = await prisma.noteShareInvite.create({
    data: {
      noteId,
      patientEmail,
      invitedById: session.user.id,
      message,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  await sendNoteShareInvite({
    toEmail: patientEmail,
    clinicianName: session.user.name || "Your clinician",
    noteTitle: note.title || "Clinical Note",
    inviteToken: invite.token,
    message: message || undefined,
  });

  revalidatePath(`/notes/${noteId}`);
  return { success: "Invitation sent successfully" };
}

export async function revokeNoteShareAction(noteId: string, patientId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const note = await prisma.clinicalNote.findUnique({
    where: { id: noteId },
    select: { userId: true },
  });

  if (!note || note.userId !== session.user.id) {
    return { error: "Note not found" };
  }

  await prisma.noteShare.deleteMany({
    where: { noteId, patientId },
  });

  revalidatePath(`/notes/${noteId}`);
  return { success: true };
}

export async function getNoteSharesAction(noteId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized", shares: [] };

  const note = await prisma.clinicalNote.findUnique({
    where: { id: noteId },
    select: { userId: true },
  });

  if (!note || note.userId !== session.user.id) {
    return { error: "Note not found", shares: [] };
  }

  const shares = await prisma.noteShare.findMany({
    where: { noteId },
    include: {
      patient: { select: { id: true, email: true, name: true } },
    },
    orderBy: { sharedAt: "desc" },
  });

  return { shares };
}
