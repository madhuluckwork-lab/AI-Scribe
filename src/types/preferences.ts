export const NOTE_FORMATS = ["paragraph", "bulleted"] as const;
export type NoteFormat = (typeof NOTE_FORMATS)[number];

export const ALL_SOAP_SECTIONS = [
  "chiefComplaint",
  "historyOfPresentIllness",
  "pastMedicalHistory",
  "medications",
  "socialHistory",
  "familyHistory",
  "reviewOfSystems",
  "physicalExam",
  "assessmentAndPlan",
] as const;

export type SoapSectionKey = (typeof ALL_SOAP_SECTIONS)[number];

export const SOAP_SECTION_LABELS: Record<SoapSectionKey, string> = {
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

export interface NoteFormatPreferences {
  noteFormat: NoteFormat;
  visibleSections: SoapSectionKey[];
}
