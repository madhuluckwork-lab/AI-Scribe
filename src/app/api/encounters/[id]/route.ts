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
    const encounter = await prisma.encounter.findUnique({
      where: { id },
      include: {
        transcription: true,
        clinicalNote: true,
      },
    });

    if (!encounter) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (encounter.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(encounter);
  } catch (error) {
    console.error("Get encounter error:", error);
    return NextResponse.json(
      { error: "Failed to get encounter" },
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
    const encounter = await prisma.encounter.findUnique({ where: { id } });

    if (!encounter || encounter.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.encounter.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete encounter error:", error);
    return NextResponse.json(
      { error: "Failed to delete encounter" },
      { status: 500 }
    );
  }
}
