import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-api";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const [totalEncounters, notesThisWeek, pendingReview, recentNotes] =
      await Promise.all([
        prisma.encounter.count({ where: { userId } }),
        prisma.clinicalNote.count({
          where: {
            userId,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.clinicalNote.count({
          where: { userId, status: { in: ["DRAFT", "REVIEW"] } },
        }),
        prisma.clinicalNote.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            encounter: {
              select: { encounterType: true, patientInitials: true },
            },
          },
        }),
      ]);

    return NextResponse.json({
      totalEncounters,
      notesThisWeek,
      pendingReview,
      recentNotes,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
