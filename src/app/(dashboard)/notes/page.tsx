import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Mic, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { DeleteNoteButton } from "@/components/notes/delete-note-button";

interface Props {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

export default async function NotesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const search = params.search || "";
  const statusFilter = params.status || "";
  const page = parseInt(params.page || "1", 10);
  const perPage = 12;

  const where: Record<string, unknown> = { userId: session.user.id };

  if (statusFilter) {
    where.status = statusFilter;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { rawContent: { contains: search, mode: "insensitive" } },
    ];
  }

  const [notes, totalCount] = await Promise.all([
    prisma.clinicalNote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        encounter: {
          select: { encounterType: true, patientInitials: true, encounterDate: true },
        },
      },
    }),
    prisma.clinicalNote.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / perPage);

  const statuses = ["DRAFT", "REVIEW", "FINAL", "SIGNED", "AMENDED"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clinical Notes</h1>
          <p className="text-muted-foreground">
            {totalCount} note{totalCount !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button asChild className="bg-[#F4891F] hover:bg-[#d97a1a]">
          <Link href="/record">
            <Mic className="mr-2 h-4 w-4" />
            New Recording
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form className="relative flex-1" action="/notes" method="get">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Search notes..."
            defaultValue={search}
            className="pl-10"
          />
          {statusFilter && (
            <input type="hidden" name="status" value={statusFilter} />
          )}
        </form>
        <div className="flex gap-2 flex-wrap">
          <Link href="/notes">
            <Badge
              variant={!statusFilter ? "default" : "outline"}
              className="cursor-pointer"
            >
              All
            </Badge>
          </Link>
          {statuses.map((s) => (
            <Link key={s} href={`/notes?status=${s}${search ? `&search=${search}` : ""}`}>
              <Badge
                variant={statusFilter === s ? "default" : "outline"}
                className="cursor-pointer"
              >
                {s}
              </Badge>
            </Link>
          ))}
        </div>
      </div>

      {/* Notes Grid */}
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium">No notes found</p>
          <p className="text-sm text-muted-foreground">
            {search
              ? "Try a different search term."
              : "Start your first recording to generate clinical notes."}
          </p>
          {!search && (
            <Button asChild className="mt-4 bg-[#F4891F] hover:bg-[#d97a1a]">
              <Link href="/record">
                <Mic className="mr-2 h-4 w-4" />
                Start Recording
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <Card key={note.id} className="group relative h-full transition-colors hover:bg-muted/50">
                <Link href={`/notes/${note.id}`} className="absolute inset-0 z-[1]" />
                <CardContent className="relative p-4 pointer-events-none">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium line-clamp-2">
                      {note.title || "Untitled Note"}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0">
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
                      <div className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                        <DeleteNoteButton
                          noteId={note.id}
                          noteTitle={note.title || undefined}
                          variant="icon"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {note.noteType}
                    </Badge>
                    {note.encounter?.patientInitials && (
                      <span>Patient: {note.encounter.patientInitials}</span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {note.encounter?.encounterType} &middot;{" "}
                    {formatDistanceToNow(note.createdAt, { addSuffix: true })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {page > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/notes?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ""}${search ? `&search=${search}` : ""}`}
                  >
                    Previous
                  </Link>
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/notes?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ""}${search ? `&search=${search}` : ""}`}
                  >
                    Next
                  </Link>
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
