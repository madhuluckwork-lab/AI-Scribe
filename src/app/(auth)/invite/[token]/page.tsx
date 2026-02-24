import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PatientInviteForm } from "@/components/auth/patient-invite-form";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;

  const invite = await prisma.noteShareInvite.findUnique({
    where: { token },
    include: {
      note: { select: { title: true } },
      invitedBy: { select: { name: true } },
    },
  });

  if (!invite || invite.expiresAt < new Date()) notFound();

  const existingUser = await prisma.user.findUnique({
    where: { email: invite.patientEmail },
  });

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          <span className="text-[#002D42]">Adit</span>{" "}
          <span className="text-[#F4891F]">Scribe</span>
        </CardTitle>
        <CardDescription>
          {invite.invitedBy.name} shared a clinical note with you
          {invite.note.title && (
            <>
              : <strong>{invite.note.title}</strong>
            </>
          )}
        </CardDescription>
        {invite.message && (
          <p className="mt-2 rounded-md bg-muted p-3 text-sm italic text-muted-foreground">
            &ldquo;{invite.message}&rdquo;
          </p>
        )}
      </CardHeader>
      <CardContent>
        <PatientInviteForm
          token={token}
          email={invite.patientEmail}
          hasExistingAccount={!!existingUser}
        />
      </CardContent>
    </Card>
  );
}
