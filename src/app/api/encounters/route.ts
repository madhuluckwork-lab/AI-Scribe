import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-api";
import { prisma } from "@/lib/prisma";
import { transcriptionQueue } from "@/lib/queue";
import { z } from "zod";

const createEncounterSchema = z.object({
  title: z.string().optional(),
  patientInitials: z.string().max(5).optional(),
  encounterType: z.enum([
    "GENERAL",
    "FOLLOW_UP",
    "INITIAL_CONSULT",
    "EMERGENCY",
    "TELEHEALTH",
    "PROCEDURE",
  ]),
  audioFileKey: z.string(),
  audioBlobUrl: z.string().optional(),
  audioFormat: z.string(),
  audioSizeBytes: z.number(),
  duration: z.number(),
});

export async function POST(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const validated = createEncounterSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Invalid request", details: validated.error.flatten() },
      { status: 400 }
    );
  }

  const data = validated.data;

  try {
    const encounter = await prisma.encounter.create({
      data: {
        userId: session.user.id,
        title:
          data.title ||
          `Encounter - ${new Date().toLocaleDateString()}`,
        patientInitials: data.patientInitials,
        encounterType: data.encounterType,
        audioFileKey: data.audioFileKey,
        audioFormat: data.audioFormat,
        audioSizeBytes: data.audioSizeBytes,
        duration: data.duration,
        status: "TRANSCRIBING",
      },
    });

    // Enqueue transcription job
    await transcriptionQueue.add(
      "transcribe",
      {
        encounterId: encounter.id,
        audioFileKey: data.audioFileKey,
        audioBlobUrl: data.audioBlobUrl || "",
        audioFormat: data.audioFormat,
        userId: session.user.id,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      }
    );

    return NextResponse.json({ encounterId: encounter.id }, { status: 201 });
  } catch (error) {
    console.error("Create encounter error:", error);
    return NextResponse.json(
      { error: "Failed to create encounter" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const skip = (page - 1) * limit;

  try {
    const [encounters, total] = await Promise.all([
      prisma.encounter.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          transcription: { select: { status: true } },
          clinicalNote: { select: { id: true, status: true } },
        },
      }),
      prisma.encounter.count({ where: { userId: session.user.id } }),
    ]);

    return NextResponse.json({
      encounters,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("List encounters error:", error);
    return NextResponse.json(
      { error: "Failed to list encounters" },
      { status: 500 }
    );
  }
}
