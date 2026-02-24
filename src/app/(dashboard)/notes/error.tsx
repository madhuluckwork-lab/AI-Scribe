"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message || "Failed to load notes."}
      </p>
      <Button onClick={reset} variant="outline" className="mt-6">
        Try Again
      </Button>
    </div>
  );
}
