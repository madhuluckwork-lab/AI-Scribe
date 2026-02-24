"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { type JSONContent } from "@tiptap/react";
import { NoteEditor } from "./note-editor";
import { TranscriptPanel } from "./transcript-panel";
import { NoteToolbar } from "./note-toolbar";
import { ShareNoteDialog } from "./share-note-dialog";
import { AudioPlayerBar } from "./audio-player-bar";
import { saveNoteAction, signNoteAction, regenerateNoteAction } from "@/actions/notes";
import { soapNoteToTiptap, tiptapToSoapNote } from "@/lib/note-to-tiptap";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { NoteFormat } from "@/types/preferences";

interface NoteEditorPageProps {
  note: {
    id: string;
    title: string | null;
    status: string;
    version: number;
    content: Record<string, unknown>;
    rawContent: string | null;
  };
  segments: Array<{ start: number; end: number; text: string }>;
  audioUrl: string | null;
  audioDuration?: number;
  userPreferences?: {
    noteFormat: string;
    visibleSections: string[];
  };
}

export function NoteEditorPage({ note, segments, audioUrl, userPreferences }: NoteEditorPageProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(note.status);
  const [currentVersion, setCurrentVersion] = useState(note.version);
  const [highlightedRange, setHighlightedRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const editorContentRef = useRef<JSONContent | null>(null);
  const [noteFormat, setNoteFormat] = useState<NoteFormat>(
    (userPreferences?.noteFormat as NoteFormat) || "paragraph"
  );
  const [shareOpen, setShareOpen] = useState(false);
  // Track a key to force editor re-mount on format change
  const [editorKey, setEditorKey] = useState(0);

  const {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    togglePlayPause,
    seekTo,
    seekAndPlay,
    setPlaybackRate,
  } = useAudioPlayer({ audioUrl });

  const visibleSections = userPreferences?.visibleSections || [];

  const tiptapContent = useMemo(
    () =>
      soapNoteToTiptap(
        note.content as unknown as Parameters<typeof soapNoteToTiptap>[0],
        { format: noteFormat, visibleSections }
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [note.content, noteFormat, visibleSections.join(",")]
  );

  const handleFormatChange = useCallback(
    (format: NoteFormat) => {
      if (format === noteFormat) return;

      // If user has made edits, convert current content to new format
      if (editorContentRef.current) {
        const { note: soapNote } = tiptapToSoapNote(editorContentRef.current);
        // The soapNote will be re-rendered in the new format via tiptapContent memo
        // We need to update note.content temporarily so the memo picks it up
        // Instead, we clear the editor ref and force re-mount
        editorContentRef.current = null;
      }

      setNoteFormat(format);
      setEditorKey((k) => k + 1);
    },
    [noteFormat]
  );

  const handleEditorUpdate = useCallback((content: JSONContent) => {
    editorContentRef.current = content;
  }, []);

  const handleSave = useCallback(async () => {
    const content = editorContentRef.current;
    if (!content) {
      toast.error("No changes to save");
      return;
    }

    setIsSaving(true);
    try {
      const { note: soapNote, rawText } = tiptapToSoapNote(content);
      const result = await saveNoteAction(
        note.id,
        soapNote as unknown as Record<string, unknown>,
        rawText
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Note saved successfully");
        setCurrentVersion(result.version!);
      }
    } catch {
      toast.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  }, [note.id]);

  const handleSign = useCallback(async () => {
    // Save first if there are changes
    if (editorContentRef.current) {
      const { note: soapNote, rawText } = tiptapToSoapNote(
        editorContentRef.current
      );
      await saveNoteAction(
        note.id,
        soapNote as unknown as Record<string, unknown>,
        rawText
      );
    }

    const result = await signNoteAction(note.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Note signed successfully");
      setCurrentStatus("SIGNED");
      router.refresh();
    }
  }, [note.id, router]);

  const handleRegenerate = useCallback(async () => {
    const result = await regenerateNoteAction(note.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.info("Note regeneration started. This page will refresh when complete.");
      router.refresh();
    }
  }, [note.id, router]);

  const handleEvidenceHover = useCallback(
    (range: { start: number; end: number } | null) => {
      setHighlightedRange(range);
    },
    []
  );

  const handleEvidenceClick = useCallback(
    (range: { start: number; end: number }) => {
      setHighlightedRange(range);
      seekAndPlay(range.start);
    },
    [seekAndPlay]
  );

  const handleSegmentClick = useCallback(
    (segment: { start: number; end: number }) => {
      setHighlightedRange({
        start: segment.start,
        end: segment.end,
      });
      seekAndPlay(segment.start);
    },
    [seekAndPlay]
  );

  // During playback, highlight the segment containing the current playback time
  const playbackHighlight = useMemo(() => {
    if (!isPlaying) return null;
    const activeSegment = segments.find(
      (s) => currentTime >= s.start && currentTime < s.end
    );
    return activeSegment
      ? { start: activeSegment.start, end: activeSegment.end }
      : null;
  }, [isPlaying, currentTime, segments]);

  const effectiveHighlight = isPlaying
    ? playbackHighlight ?? highlightedRange
    : highlightedRange;

  const isSigned = currentStatus === "SIGNED";

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <NoteToolbar
        noteId={note.id}
        status={currentStatus}
        version={currentVersion}
        isSaving={isSaving}
        onSave={handleSave}
        onSign={handleSign}
        onRegenerate={handleRegenerate}
        onShare={() => setShareOpen(true)}
        rawContent={note.rawContent ?? undefined}
        noteFormat={noteFormat}
        onFormatChange={handleFormatChange}
      />
      {audioUrl && (
        <AudioPlayerBar
          audioRef={audioRef}
          audioUrl={audioUrl}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          playbackRate={playbackRate}
          onTogglePlayPause={togglePlayPause}
          onSeek={seekTo}
          onPlaybackRateChange={setPlaybackRate}
        />
      )}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Editor - 60% on desktop, full width on mobile */}
        <div className="flex-1 overflow-auto border-b lg:border-b-0 lg:border-r lg:w-3/5">
          <div className="mx-auto max-w-3xl">
            {note.title && (
              <h1 className="px-6 pt-6 text-2xl font-bold">{note.title}</h1>
            )}
            <NoteEditor
              key={editorKey}
              content={tiptapContent}
              editable={!isSigned}
              onUpdate={handleEditorUpdate}
              onEvidenceHover={handleEvidenceHover}
              onEvidenceClick={handleEvidenceClick}
            />
          </div>
        </div>
        {/* Transcript - 40% on desktop, stacked below on mobile */}
        <div className="h-72 overflow-hidden lg:h-auto lg:w-2/5">
          <TranscriptPanel
            segments={segments}
            highlightedRange={effectiveHighlight}
            onSegmentClick={handleSegmentClick}
          />
        </div>
      </div>
      <ShareNoteDialog
        noteId={note.id}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </div>
  );
}
