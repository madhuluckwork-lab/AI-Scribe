import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invite = await prisma.noteShareInvite.findUnique({
    where: { token },
    include: {
      note: { select: { title: true } },
      invitedBy: { select: { name: true } },
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Invitation expired" },
      { status: 410 }
    );
  }

  if (invite.redeemedAt) {
    return NextResponse.json(
      { error: "Invitation already used" },
      { status: 409 }
    );
  }

  return NextResponse.json({
    patientEmail: invite.patientEmail,
    noteTitle: invite.note.title,
    clinicianName: invite.invitedBy.name,
    message: invite.message,
  });
}
