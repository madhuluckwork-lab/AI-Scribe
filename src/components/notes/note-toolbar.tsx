"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  FileSignature,
  RefreshCw,
  Copy,
  Check,
  Loader2,
  AlignLeft,
  List,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import type { NoteFormat } from "@/types/preferences";
import { DeleteNoteButton } from "./delete-note-button";

interface NoteToolbarProps {
  noteId: string;
  status: string;
  version: number;
  isSaving: boolean;
  onSave: () => void;
  onSign: () => void;
  onRegenerate: () => void;
  onShare?: () => void;
  rawContent?: string;
  noteFormat: NoteFormat;
  onFormatChange: (format: NoteFormat) => void;
}

export function NoteToolbar({
  noteId,
  status,
  version,
  isSaving,
  onSave,
  onSign,
  onRegenerate,
  onShare,
  rawContent,
  noteFormat,
  onFormatChange,
}: NoteToolbarProps) {
  const [copied, setCopied] = useState(false);
  const [isRegenerating, startRegenerate] = useTransition();
  const [isSigning, startSign] = useTransition();

  const handleCopy = async () => {
    if (!rawContent) return;
    await navigator.clipboard.writeText(rawContent);
    setCopied(true);
    toast.success("Note copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSign = () => {
    startSign(() => {
      onSign();
    });
  };

  const handleRegenerate = () => {
    startRegenerate(() => {
      onRegenerate();
    });
  };

  const isSigned = status === "SIGNED";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
      <div className="flex items-center gap-2">
        <Badge
          variant={
            status === "SIGNED"
              ? "default"
              : status === "DRAFT"
                ? "secondary"
                : "outline"
          }
        >
          {status}
        </Badge>
        <span className="text-xs text-muted-foreground">v{version}</span>
        <div className="flex items-center rounded-md border ml-2">
          <Button
            variant={noteFormat === "paragraph" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 rounded-r-none"
            onClick={() => onFormatChange("paragraph")}
            title="Paragraph format"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={noteFormat === "bulleted" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 rounded-l-none"
            onClick={() => onFormatChange("bulleted")}
            title="Bulleted format"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <DeleteNoteButton
          noteId={noteId}
          variant="button"
          redirectTo="/notes"
        />
        {onShare && (
          <Button variant="ghost" size="sm" onClick={onShare}>
            <Share2 className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          disabled={!rawContent}
        >
          {copied ? (
            <Check className="h-4 w-4 sm:mr-1" />
          ) : (
            <Copy className="h-4 w-4 sm:mr-1" />
          )}
          <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRegenerate}
          disabled={isSigned || isRegenerating}
        >
          {isRegenerating ? (
            <Loader2 className="h-4 w-4 sm:mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 sm:mr-1" />
          )}
          <span className="hidden sm:inline">Regenerate</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={isSigned || isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-1" />
          )}
          Save
        </Button>
        <Button
          size="sm"
          onClick={handleSign}
          disabled={isSigned || isSigning}
          className="bg-[#F4891F] hover:bg-[#d97a1a]"
        >
          {isSigning ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <FileSignature className="h-4 w-4 mr-1" />
          )}
          {isSigned ? "Signed" : "Sign Note"}
        </Button>
      </div>
    </div>
  );
}
