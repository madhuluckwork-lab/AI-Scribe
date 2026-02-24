"use client";

import { cn } from "@/lib/utils";

interface RecordingTimerProps {
  duration: number;
  isRecording: boolean;
  isPaused: boolean;
}

function formatDuration(totalSeconds: number): string {
  const s = Math.floor(totalSeconds);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function RecordingTimer({
  duration,
  isRecording,
  isPaused,
}: RecordingTimerProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "h-3 w-3 rounded-full",
          isRecording && !isPaused && "animate-pulse bg-red-500",
          isPaused && "bg-yellow-500",
          !isRecording && "bg-muted-foreground/30"
        )}
      />
      <span className="font-mono text-3xl font-bold tabular-nums">
        {formatDuration(duration)}
      </span>
      {isPaused && (
        <span className="text-sm font-medium text-yellow-600">PAUSED</span>
      )}
    </div>
  );
}
