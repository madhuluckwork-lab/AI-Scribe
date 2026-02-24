import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, FileText, Clock, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const userId = session.user.id;

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
          encounter: { select: { encounterType: true, patientInitials: true } },
        },
      }),
    ]);

  const stats = [
    {
      label: "Total Encounters",
      value: totalEncounters,
      icon: Mic,
    },
    {
      label: "Notes This Week",
      value: notesThisWeek,
      icon: FileText,
    },
    {
      label: "Pending Review",
      value: pendingReview,
      icon: AlertCircle,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {session.user.name?.split(" ")[0] ?? "Doctor"}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s a summary of your clinical documentation.
          </p>
        </div>
        <Button asChild size="lg" className="bg-[#F4891F] hover:bg-[#d97a1a]">
          <Link href="/record">
            <Mic className="mr-2 h-4 w-4" />
            New Recording
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Notes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Notes</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/notes">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-lg font-medium">No notes yet</p>
              <p className="text-sm text-muted-foreground">
                Start your first recording to generate clinical notes.
              </p>
              <Button asChild className="mt-4 bg-[#F4891F] hover:bg-[#d97a1a]">
                <Link href="/record">
                  <Mic className="mr-2 h-4 w-4" />
                  Start Recording
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentNotes.map((note) => (
                <Link
                  key={note.id}
                  href={`/notes/${note.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {note.title ?? "Untitled Note"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {note.encounter?.patientInitials
                          ? `Patient: ${note.encounter.patientInitials} - `
                          : ""}
                        {formatDistanceToNow(note.createdAt, {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        note.status === "SIGNED"
                          ? "default"
                          : note.status === "DRAFT"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {note.status}
                    </Badge>
                    <Badge variant="outline">{note.noteType}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
