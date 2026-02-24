"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { NOTE_FORMATS, ALL_SOAP_SECTIONS } from "@/types/preferences";
import type { Prisma } from "@/generated/prisma/client";

export async function updatePreferencesAction(preferences: {
  noteFormat?: string;
  visibleSections?: string[];
}) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  // Validate noteFormat
  if (
    preferences.noteFormat &&
    !NOTE_FORMATS.includes(preferences.noteFormat as (typeof NOTE_FORMATS)[number])
  ) {
    return { error: "Invalid note format" };
  }

  // Validate visibleSections
  if (preferences.visibleSections) {
    const valid = preferences.visibleSections.every((s) =>
      ALL_SOAP_SECTIONS.includes(s as (typeof ALL_SOAP_SECTIONS)[number])
    );
    if (!valid) return { error: "Invalid section key" };
  }

  const data: Record<string, unknown> = {};
  if (preferences.noteFormat !== undefined) {
    data.noteFormat = preferences.noteFormat;
  }
  if (preferences.visibleSections !== undefined) {
    data.visibleSections = preferences.visibleSections as unknown as Prisma.InputJsonValue;
  }

  await prisma.userPreference.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  });

  revalidatePath("/settings");
  revalidatePath("/notes");
  return { success: true };
}
