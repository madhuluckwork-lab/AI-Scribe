import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { NoteEditorPage } from "@/components/notes/note-editor-page";
import { EncounterProcessingPoller } from "@/components/notes/encounter-processing-poller";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NoteDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  // First try to find a clinical note
  const note = await prisma.clinicalNote.findUnique({
    where: { id },
    include: {
      encounter: {
        include: {
          transcription: {
            select: { segments: true, fullText: true },
          },
        },
      },
    },
  });

  if (note) {
    if (note.userId !== session.user.id) notFound();

    const segments = (note.encounter.transcription?.segments ?? []) as Array<{
      start: number;
      end: number;
      text: string;
    }>;

    const audioUrl = note.encounter.audioFileKey
      ? `/api/audio/${note.encounter.audioFileKey.replace(/^audio\//, "")}`
      : null;

    // Fetch user preferences for note formatting
    const userPref = await prisma.userPreference.findUnique({
      where: { userId: session.user.id },
      select: { noteFormat: true, visibleSections: true },
    });

    return (
      <NoteEditorPage
        note={{
          id: note.id,
          title: note.title,
          status: note.status,
          version: note.version,
          content: note.content as Record<string, unknown>,
          rawContent: note.rawContent,
        }}
        segments={segments}
        audioUrl={audioUrl}
        audioDuration={note.encounter.duration ?? undefined}
        userPreferences={{
          noteFormat: userPref?.noteFormat || "paragraph",
          visibleSections: (userPref?.visibleSections as string[]) || [],
        }}
      />
    );
  }

  // Check if this is an encounter still processing
  const encounter = await prisma.encounter.findUnique({
    where: { id },
    select: { id: true, status: true, userId: true },
  });

  if (!encounter || encounter.userId !== session.user.id) notFound();

  // Show processing state with client-side polling for auto-redirect
  return (
    <EncounterProcessingPoller
      encounterId={encounter.id}
      initialStatus={encounter.status}
    />
  );
}
