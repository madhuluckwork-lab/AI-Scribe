"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";

export async function saveNoteAction(
  noteId: string,
  content: Record<string, unknown>,
  rawContent: string
) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const note = await prisma.clinicalNote.findUnique({
    where: { id: noteId },
    select: { userId: true, version: true },
  });

  if (!note || note.userId !== session.user.id) {
    return { error: "Note not found" };
  }

  const newVersion = note.version + 1;

  await prisma.$transaction([
    prisma.clinicalNote.update({
      where: { id: noteId },
      data: {
        content: content as unknown as Prisma.InputJsonValue,
        rawContent,
        version: newVersion,
        status: "DRAFT",
      },
    }),
    prisma.noteHistory.create({
      data: {
        noteId,
        content: content as unknown as Prisma.InputJsonValue,
        version: newVersion,
        changedBy: session.user.id,
        changeType: "EDITED",
      },
    }),
  ]);

  revalidatePath(`/notes/${noteId}`);
  return { success: true, version: newVersion };
}

export async function signNoteAction(noteId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const note = await prisma.clinicalNote.findUnique({
    where: { id: noteId },
    select: { userId: true, version: true, content: true },
  });

  if (!note || note.userId !== session.user.id) {
    return { error: "Note not found" };
  }

  const newVersion = note.version + 1;

  await prisma.$transaction([
    prisma.clinicalNote.update({
      where: { id: noteId },
      data: {
        status: "SIGNED",
        signedAt: new Date(),
        signedBy: session.user.id,
        version: newVersion,
      },
    }),
    prisma.noteHistory.create({
      data: {
        noteId,
        content: note.content as unknown as Prisma.InputJsonValue,
        version: newVersion,
        changedBy: session.user.id,
        changeType: "SIGNED",
      },
    }),
  ]);

  revalidatePath(`/notes/${noteId}`);
  return { success: true };
}

export async function regenerateNoteAction(noteId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const note = await prisma.clinicalNote.findUnique({
    where: { id: noteId },
    select: {
      userId: true,
      encounterId: true,
      encounter: {
        select: {
          transcription: {
            select: { fullText: true, segments: true },
          },
        },
      },
    },
  });

  if (!note || note.userId !== session.user.id) {
    return { error: "Note not found" };
  }

  if (!note.encounter.transcription) {
    return { error: "No transcription found" };
  }

  // Re-enqueue for note generation
  const { Queue } = await import("bullmq");
  const IORedis = (await import("ioredis")).default;
  const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6380", {
    maxRetriesPerRequest: null,
  });
  const noteQueue = new Queue("note-generation", { connection: redis });

  // Update status
  await prisma.clinicalNote.update({
    where: { id: noteId },
    data: { status: "DRAFT" },
  });

  await prisma.encounter.update({
    where: { id: note.encounterId },
    data: { status: "GENERATING_NOTE" },
  });

  await noteQueue.add(
    "generate",
    {
      encounterId: note.encounterId,
      userId: session.user.id,
      transcriptionText: note.encounter.transcription.fullText,
      segments: note.encounter.transcription.segments as Array<{
        start: number;
        end: number;
        text: string;
      }>,
    },
    {
      attempts: 2,
      backoff: { type: "exponential", delay: 10000 },
    }
  );

  await redis.quit();
  revalidatePath(`/notes/${noteId}`);
  return { success: true };
}

export async function deleteNoteAction(noteId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const note = await prisma.clinicalNote.findUnique({
    where: { id: noteId },
    select: { userId: true },
  });

  if (!note || note.userId !== session.user.id) {
    return { error: "Note not found" };
  }

  await prisma.clinicalNote.delete({ where: { id: noteId } });
  revalidatePath("/notes");
  return { success: true };
}
