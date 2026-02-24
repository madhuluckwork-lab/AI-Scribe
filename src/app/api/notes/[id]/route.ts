import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-api";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Try to find a note by ID first
    let note = await prisma.clinicalNote.findUnique({
      where: { id },
      include: {
        encounter: {
          include: {
            transcription: true,
          },
        },
        history: {
          orderBy: { version: "desc" },
          take: 10,
        },
      },
    });

    // If not found, try treating the ID as an encounter ID
    if (!note) {
      note = await prisma.clinicalNote.findUnique({
        where: { encounterId: id },
        include: {
          encounter: {
            include: {
              transcription: true,
            },
          },
          history: {
            orderBy: { version: "desc" },
            take: 10,
          },
        },
      });
    }

    if (!note) {
      // Check if there's an encounter being processed
      const encounter = await prisma.encounter.findUnique({
        where: { id },
        include: { transcription: true },
      });

      if (encounter && encounter.userId === session.user.id) {
        return NextResponse.json({
          processing: true,
          encounter,
          note: null,
        });
      }

      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (note.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ note, processing: false });
  } catch (error) {
    console.error("Get note error:", error);
    return NextResponse.json(
      { error: "Failed to get note" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  try {
    const existing = await prisma.clinicalNote.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const newVersion = existing.version + 1;

    const [updatedNote] = await prisma.$transaction([
      prisma.clinicalNote.update({
        where: { id },
        data: {
          content: body.content ?? existing.content,
          rawContent: body.rawContent,
          htmlContent: body.htmlContent,
          title: body.title ?? existing.title,
          status: body.status ?? existing.status,
          signedAt: body.status === "SIGNED" ? new Date() : existing.signedAt,
          signedBy:
            body.status === "SIGNED"
              ? session.user.name || session.user.email || session.user.id
              : existing.signedBy,
          version: newVersion,
        },
      }),
      prisma.noteHistory.create({
        data: {
          noteId: id,
          content: body.content ?? existing.content,
          version: newVersion,
          changedBy: session.user.id,
          changeType: body.changeType || "manual_edit",
        },
      }),
    ]);

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error("Update note error:", error);
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const note = await prisma.clinicalNote.findUnique({
      where: { id },
      include: {
        encounter: { select: { id: true, audioFileKey: true } },
      },
    });
    if (!note || note.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const audioFileKey = note.encounter?.audioFileKey;

    // Delete the encounter (cascades to note, transcription, note history)
    if (note.encounter) {
      await prisma.encounter.delete({ where: { id: note.encounter.id } });
    } else {
      await prisma.clinicalNote.delete({ where: { id } });
    }

    // Clean up audio file (best-effort)
    if (audioFileKey) {
      try {
        const { deleteAudio } = await import("@/lib/storage");
        await deleteAudio(audioFileKey);
      } catch {
        // Ignore cleanup errors
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete note error:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
