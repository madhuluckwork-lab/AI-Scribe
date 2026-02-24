"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function NoteDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">Failed to load note</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message || "The note could not be loaded."}
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset} variant="outline">
          Try Again
        </Button>
        <Button asChild variant="ghost">
          <Link href="/notes">Back to Notes</Link>
        </Button>
      </div>
    </div>
  );
}
