import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-api";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { userId: session.user.id };
  if (status) {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { rawContent: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const [notes, total] = await Promise.all([
      prisma.clinicalNote.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          encounter: {
            select: {
              encounterType: true,
              patientInitials: true,
              duration: true,
            },
          },
        },
      }),
      prisma.clinicalNote.count({ where }),
    ]);

    return NextResponse.json({
      notes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("List notes error:", error);
    return NextResponse.json(
      { error: "Failed to list notes" },
      { status: 500 }
    );
  }
}
