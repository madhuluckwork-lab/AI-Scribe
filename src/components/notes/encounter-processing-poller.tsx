"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEncounterStatus } from "@/hooks/use-encounter-status";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EncounterProcessingPollerProps {
  encounterId: string;
  initialStatus: string;
}

export function EncounterProcessingPoller({
  encounterId,
  initialStatus,
}: EncounterProcessingPollerProps) {
  const router = useRouter();
  const { data } = useEncounterStatus(encounterId);

  const status = data?.status ?? initialStatus;

  useEffect(() => {
    if (data?.status === "REVIEW" && data.clinicalNote?.id) {
      router.replace(`/notes/${data.clinicalNote.id}`);
    }
  }, [data, router]);

  if (data?.status === "ERROR") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Processing Failed</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong while processing your recording. Please try again.
        </p>
        <Button asChild variant="ghost" className="mt-6">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Loader2 className="mb-4 h-12 w-12 animate-spin text-[#F4891F]" />
      <h2 className="text-xl font-semibold">
        {status === "TRANSCRIBING"
          ? "Transcribing audio..."
          : status === "GENERATING_NOTE"
            ? "Generating clinical note..."
            : "Processing..."}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This may take a moment. The page will update automatically.
      </p>
      <Button asChild variant="ghost" className="mt-6">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>
    </div>
  );
}
