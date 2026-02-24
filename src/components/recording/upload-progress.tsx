"use client";

import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface UploadProgressProps {
  progress: number;
  status: "idle" | "uploading" | "processing" | "done" | "error";
  error?: string;
}

const statusLabels: Record<string, string> = {
  uploading: "Uploading audio...",
  processing: "Creating encounter...",
  done: "Upload complete! Processing started.",
  error: "Upload failed",
};

export function UploadProgress({ progress, status, error }: UploadProgressProps) {
  if (status === "idle") return null;

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        {status === "uploading" || status === "processing" ? (
          <Loader2 className="h-4 w-4 animate-spin text-[#F4891F]" />
        ) : status === "done" ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <AlertCircle className="h-4 w-4 text-destructive" />
        )}
        <span className="text-sm font-medium">
          {error ?? statusLabels[status]}
        </span>
      </div>
      {(status === "uploading" || status === "processing") && (
        <Progress value={progress} className="h-2" />
      )}
    </div>
  );
}
