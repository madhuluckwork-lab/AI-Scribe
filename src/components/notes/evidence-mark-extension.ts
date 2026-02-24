import { Mark, mergeAttributes } from "@tiptap/react";

export interface EvidenceLinkAttributes {
  start: number;
  end: number;
  transcriptText: string;
}

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    evidenceLink: {
      setEvidenceLink: (attrs: EvidenceLinkAttributes) => ReturnType;
      unsetEvidenceLink: () => ReturnType;
    };
  }
}

export const EvidenceLinkMark = Mark.create({
  name: "evidenceLink",

  addAttributes() {
    return {
      start: {
        default: 0,
        parseHTML: (element) => parseFloat(element.getAttribute("data-start") || "0"),
        renderHTML: (attributes) => ({
          "data-start": attributes.start,
        }),
      },
      end: {
        default: 0,
        parseHTML: (element) => parseFloat(element.getAttribute("data-end") || "0"),
        renderHTML: (attributes) => ({
          "data-end": attributes.end,
        }),
      },
      transcriptText: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-transcript") || "",
        renderHTML: (attributes) => ({
          "data-transcript": attributes.transcriptText,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-evidence-link]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-evidence-link": "",
        class: "evidence-link",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setEvidenceLink:
        (attrs: EvidenceLinkAttributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attrs);
        },
      unsetEvidenceLink:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});
