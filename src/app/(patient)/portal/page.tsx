import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, User } from "lucide-react";

export default async function PatientPortalPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sharedNotes = await prisma.noteShare.findMany({
    where: { patientId: session.user.id },
    orderBy: { sharedAt: "desc" },
    include: {
      note: {
        select: {
          id: true,
          title: true,
          noteType: true,
          status: true,
          createdAt: true,
          encounter: {
            select: { encounterType: true, encounterDate: true },
          },
        },
      },
      sharedBy: { select: { name: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Notes</h1>
        <p className="text-muted-foreground">
          Clinical notes shared with you by your healthcare providers.
        </p>
      </div>

      {sharedNotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold">No notes yet</h3>
            <p className="text-sm text-muted-foreground">
              When your healthcare provider shares notes with you, they will
              appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sharedNotes.map((share) => (
            <Link key={share.id} href={`/portal/notes/${share.note.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base line-clamp-2">
                      {share.note.title || "Clinical Note"}
                    </CardTitle>
                    <Badge variant="outline" className="ml-2 shrink-0">
                      {share.note.noteType}
                    </Badge>
                  </div>
                  <CardDescription>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>Dr. {share.sharedBy.name}</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(share.note.encounter.encounterDate).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {share.note.encounter.encounterType.replace("_", " ")}
                    </Badge>
                  </div>
                  {share.message && (
                    <p className="mt-2 text-xs italic text-muted-foreground line-clamp-2">
                      &ldquo;{share.message}&rdquo;
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
