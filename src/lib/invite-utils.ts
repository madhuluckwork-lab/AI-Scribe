import { prisma } from "@/lib/prisma";

export async function redeemPendingInvites(userId: string, email: string) {
  const pendingInvites = await prisma.noteShareInvite.findMany({
    where: {
      patientEmail: email,
      redeemedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  for (const invite of pendingInvites) {
    await prisma.$transaction([
      prisma.noteShare.upsert({
        where: {
          noteId_patientId: { noteId: invite.noteId, patientId: userId },
        },
        create: {
          noteId: invite.noteId,
          patientId: userId,
          sharedById: invite.invitedById,
          message: invite.message,
        },
        update: {},
      }),
      prisma.noteShareInvite.update({
        where: { id: invite.id },
        data: { redeemedAt: new Date() },
      }),
    ]);
  }
}
