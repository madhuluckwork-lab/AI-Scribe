import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { PatientNoteView } from "@/components/notes/patient-note-view";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PatientNotePage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  // Verify patient has access via NoteShare
  const share = await prisma.noteShare.findUnique({
    where: {
      noteId_patientId: { noteId: id, patientId: session.user.id },
    },
    include: {
      note: {
        select: {
          id: true,
          title: true,
          noteType: true,
          content: true,
          status: true,
          createdAt: true,
          encounter: {
            select: {
              encounterType: true,
              encounterDate: true,
              patientInitials: true,
            },
          },
        },
      },
      sharedBy: { select: { name: true } },
    },
  });

  if (!share) notFound();

  // Mark as viewed on first access
  if (!share.viewedAt) {
    await prisma.noteShare.update({
      where: { id: share.id },
      data: { viewedAt: new Date() },
    });
  }

  return (
    <PatientNoteView
      note={{
        id: share.note.id,
        title: share.note.title,
        noteType: share.note.noteType,
        content: share.note.content as Record<string, unknown>,
        createdAt: share.note.createdAt,
        encounterType: share.note.encounter.encounterType,
        encounterDate: share.note.encounter.encounterDate,
      }}
      clinicianName={share.sharedBy.name || "Your Provider"}
      sharedAt={share.sharedAt}
    />
  );
}
