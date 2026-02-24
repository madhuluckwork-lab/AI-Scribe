"use client";

import { RefObject, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

interface AudioPlayerBarProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  audioUrl: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  onTogglePlayPause: () => void;
  onSeek: (time: number) => void;
  onPlaybackRateChange: (rate: number) => void;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function AudioPlayerBar({
  audioRef,
  audioUrl,
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  onTogglePlayPause,
  onSeek,
  onPlaybackRateChange,
}: AudioPlayerBarProps) {
  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSeek(parseFloat(e.target.value));
    },
    [onSeek]
  );

  const cyclePlaybackRate = useCallback(() => {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length;
    onPlaybackRateChange(PLAYBACK_RATES[nextIndex]);
  }, [playbackRate, onPlaybackRateChange]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-2">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onTogglePlayPause}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <span className="shrink-0 text-xs font-mono text-muted-foreground w-10 text-right">
        {formatTime(currentTime)}
      </span>

      <div className="relative flex-1 h-8 flex items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-[#F4891F] rounded-full transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="absolute inset-x-0 w-full h-8 opacity-0 cursor-pointer"
        />
      </div>

      <span className="shrink-0 text-xs font-mono text-muted-foreground w-10">
        {formatTime(duration)}
      </span>

      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs font-mono shrink-0"
        onClick={cyclePlaybackRate}
      >
        {playbackRate}x
      </Button>
    </div>
  );
}
