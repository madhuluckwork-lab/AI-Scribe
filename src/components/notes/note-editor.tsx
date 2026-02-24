"use client";

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { EvidenceLinkMark } from "./evidence-mark-extension";
import { useCallback, useEffect } from "react";

interface NoteEditorProps {
  content: JSONContent;
  editable: boolean;
  onUpdate?: (content: JSONContent) => void;
  onEvidenceHover?: (range: { start: number; end: number } | null) => void;
  onEvidenceClick?: (range: { start: number; end: number }) => void;
}

export function NoteEditor({
  content,
  editable,
  onUpdate,
  onEvidenceHover,
  onEvidenceClick,
}: NoteEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Highlight,
      Placeholder.configure({
        placeholder: "Start writing your clinical note...",
      }),
      EvidenceLinkMark,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[400px] px-6 py-4",
      },
      handleDOMEvents: {
        mouseover: (_view, event) => {
          const target = event.target as HTMLElement;
          const evidenceEl = target.closest("[data-evidence-link]");
          if (evidenceEl) {
            const start = parseFloat(
              evidenceEl.getAttribute("data-start") || "0"
            );
            const end = parseFloat(
              evidenceEl.getAttribute("data-end") || "0"
            );
            onEvidenceHover?.({ start, end });
          } else {
            onEvidenceHover?.(null);
          }
          return false;
        },
        click: (_view, event) => {
          const target = event.target as HTMLElement;
          const evidenceEl = target.closest("[data-evidence-link]");
          if (evidenceEl) {
            const start = parseFloat(
              evidenceEl.getAttribute("data-start") || "0"
            );
            const end = parseFloat(
              evidenceEl.getAttribute("data-end") || "0"
            );
            onEvidenceClick?.({ start, end });
          }
          return false;
        },
      },
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  const getContent = useCallback(() => {
    return editor?.getJSON() ?? content;
  }, [editor, content]);

  // Expose getContent for parent
  useEffect(() => {
    if (editor) {
      (editor as unknown as { getContentForSave: () => JSONContent }).getContentForSave =
        getContent;
    }
  }, [editor, getContent]);

  if (!editor) return null;

  return (
    <div className="note-editor">
      <EditorContent editor={editor} />
    </div>
  );
}
