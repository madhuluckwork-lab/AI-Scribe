import type { JSONContent } from "@tiptap/react";
import type { NoteFormat } from "@/types/preferences";

interface SOAPNoteSection {
  content: string;
  evidence: Array<{ text: string; start: number; end: number }>;
}

interface SOAPNote {
  chiefComplaint: SOAPNoteSection;
  historyOfPresentIllness: SOAPNoteSection;
  pastMedicalHistory: SOAPNoteSection;
  medications: SOAPNoteSection;
  socialHistory: SOAPNoteSection;
  familyHistory: SOAPNoteSection;
  reviewOfSystems: SOAPNoteSection;
  physicalExam: SOAPNoteSection;
  assessmentAndPlan: SOAPNoteSection;
}

const SECTION_LABELS: Record<string, string> = {
  chiefComplaint: "Chief Complaint",
  historyOfPresentIllness: "History of Present Illness",
  pastMedicalHistory: "Past Medical History",
  medications: "Medications",
  socialHistory: "Social History",
  familyHistory: "Family History",
  reviewOfSystems: "Review of Systems",
  physicalExam: "Physical Exam",
  assessmentAndPlan: "Assessment & Plan",
};

interface SoapToTiptapOptions {
  format?: NoteFormat;
  visibleSections?: string[]; // empty = all
}

function buildTextNode(
  text: string,
  evidence: SOAPNoteSection["evidence"]
): JSONContent {
  const marks: Array<{ type: string; attrs?: Record<string, unknown> }> = [];

  const matchingEvidence = evidence?.find((ev) =>
    text.includes(ev.text.substring(0, 30))
  );

  if (matchingEvidence) {
    marks.push({
      type: "evidenceLink",
      attrs: {
        start: matchingEvidence.start,
        end: matchingEvidence.end,
        transcriptText: matchingEvidence.text,
      },
    });
  }

  return {
    type: "text",
    text,
    marks: marks.length > 0 ? marks : undefined,
  };
}

export function soapNoteToTiptap(
  note: SOAPNote,
  options?: SoapToTiptapOptions
): JSONContent {
  const content: JSONContent[] = [];
  const format = options?.format || "paragraph";
  const visibleSections = options?.visibleSections;

  // Determine which sections to render
  const sections =
    visibleSections && visibleSections.length > 0
      ? Object.entries(SECTION_LABELS).filter(([key]) =>
          visibleSections.includes(key)
        )
      : Object.entries(SECTION_LABELS);

  for (const [key, label] of sections) {
    const section = note[key as keyof SOAPNote];
    if (!section) continue;

    // Section heading
    content.push({
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: label }],
    });

    // Section content - split by paragraphs
    const paragraphs = section.content.split("\n").filter((p) => p.trim());

    if (format === "bulleted" && paragraphs.length > 0) {
      // Bulleted format: wrap in bulletList > listItem > paragraph
      const items: JSONContent[] = paragraphs.map((para) => ({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [buildTextNode(para, section.evidence)],
          },
        ],
      }));

      content.push({
        type: "bulletList",
        content: items,
      });
    } else {
      // Paragraph format (default)
      for (const para of paragraphs) {
        content.push({
          type: "paragraph",
          content: [buildTextNode(para, section.evidence)],
        });
      }
    }
  }

  return {
    type: "doc",
    content,
  };
}

export function tiptapToSoapNote(
  doc: JSONContent
): { note: SOAPNote; rawText: string } {
  const note: Record<string, SOAPNoteSection> = {};
  let currentSection: string | null = null;
  let rawText = "";

  const sectionKeysByLabel = Object.fromEntries(
    Object.entries(SECTION_LABELS).map(([k, v]) => [v, k])
  );

  for (const node of doc.content || []) {
    if (node.type === "heading" && node.content?.[0]?.text) {
      const label = node.content[0].text;
      currentSection = sectionKeysByLabel[label] || null;
      if (currentSection) {
        note[currentSection] = { content: "", evidence: [] };
      }
      rawText += `\n## ${label}\n`;
    } else if (node.type === "paragraph" && currentSection && note[currentSection]) {
      processParagraphNode(node, note[currentSection]);
      const text = extractTextFromNode(node);
      rawText += text + "\n";
    } else if (node.type === "bulletList" && currentSection && note[currentSection]) {
      // Handle bulleted format: iterate listItem children
      for (const listItem of node.content || []) {
        if (listItem.type === "listItem") {
          for (const child of listItem.content || []) {
            if (child.type === "paragraph") {
              processParagraphNode(child, note[currentSection!]);
              const text = extractTextFromNode(child);
              rawText += "- " + text + "\n";
            }
          }
        }
      }
    }
  }

  // Fill in missing sections
  for (const key of Object.keys(SECTION_LABELS)) {
    if (!note[key]) {
      note[key] = { content: "Not documented in encounter.", evidence: [] };
    }
  }

  return { note: note as unknown as SOAPNote, rawText };
}

function processParagraphNode(
  node: JSONContent,
  section: SOAPNoteSection
): void {
  const text = extractTextFromNode(node);
  if (section.content) {
    section.content += "\n" + text;
  } else {
    section.content = text;
  }

  // Extract evidence marks
  for (const child of node.content || []) {
    if (child.marks) {
      for (const mark of child.marks) {
        if (mark.type === "evidenceLink" && mark.attrs) {
          section.evidence.push({
            text: (mark.attrs.transcriptText as string) || "",
            start: (mark.attrs.start as number) || 0,
            end: (mark.attrs.end as number) || 0,
          });
        }
      }
    }
  }
}

function extractTextFromNode(node: JSONContent): string {
  if (node.text) return node.text;
  if (node.content) {
    return node.content.map(extractTextFromNode).join("");
  }
  return "";
}

export { SECTION_LABELS };
export type { SOAPNote, SOAPNoteSection };
