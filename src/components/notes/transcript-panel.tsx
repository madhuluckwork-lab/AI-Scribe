"use client";

import { useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Segment {
  start: number;
  end: number;
  text: string;
}

interface TranscriptPanelProps {
  segments: Segment[];
  highlightedRange?: { start: number; end: number } | null;
  onSegmentClick?: (segment: Segment) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function TranscriptPanel({
  segments,
  highlightedRange,
  onSegmentClick,
}: TranscriptPanelProps) {
  const highlightedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightedRef.current) {
      highlightedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightedRange]);

  const isHighlighted = useCallback(
    (segment: Segment) => {
      if (!highlightedRange) return false;
      return (
        segment.start >= highlightedRange.start - 0.5 &&
        segment.end <= highlightedRange.end + 0.5
      );
    },
    [highlightedRange]
  );

  const isInRange = useCallback(
    (segment: Segment) => {
      if (!highlightedRange) return false;
      return (
        segment.start < highlightedRange.end &&
        segment.end > highlightedRange.start
      );
    },
    [highlightedRange]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h3 className="font-semibold text-sm">Transcript</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {segments.length} segments
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1">
          {segments.map((segment, index) => {
            const highlighted = isHighlighted(segment);
            const inRange = isInRange(segment);
            return (
              <div
                key={index}
                ref={highlighted ? highlightedRef : undefined}
                className={cn(
                  "group flex gap-2 rounded-md px-2 py-1.5 text-sm transition-colors cursor-pointer hover:bg-muted/50",
                  highlighted && "bg-blue-100 dark:bg-blue-900/30",
                  inRange && !highlighted && "bg-blue-50 dark:bg-blue-950/20"
                )}
                onClick={() => onSegmentClick?.(segment)}
              >
                <span className="shrink-0 text-xs font-mono text-muted-foreground pt-0.5">
                  {formatTime(segment.start)}
                </span>
                <span
                  className={cn(
                    "leading-relaxed",
                    highlighted && "font-medium text-blue-900 dark:text-blue-100"
                  )}
                >
                  {segment.text}
                </span>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
