export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  specialty: string | null;
}

export interface DashboardStats {
  totalEncounters: number;
  notesThisWeek: number;
  pendingReview: number;
  recentNotes: RecentNote[];
}

export interface RecentNote {
  id: string;
  title: string;
  status: NoteStatus;
  createdAt: string;
  encounter: {
    encounterType: string;
    patientInitials: string | null;
  };
}

export type NoteStatus = "DRAFT" | "REVIEW" | "SIGNED";
export type EncounterStatus =
  | "RECORDING"
  | "TRANSCRIBING"
  | "GENERATING_NOTE"
  | "REVIEW"
  | "ERROR";

export interface Note {
  id: string;
  title: string;
  content: Record<string, unknown>;
  rawContent: string | null;
  status: NoteStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  encounter: {
    id: string;
    encounterType: string;
    patientInitials: string | null;
    duration: number | null;
    status: EncounterStatus;
    transcription?: {
      fullText: string;
      segments: Array<{ start: number; end: number; text: string }>;
    } | null;
  };
}

export interface Encounter {
  id: string;
  title: string;
  encounterType: string;
  patientInitials: string | null;
  status: EncounterStatus;
  duration: number | null;
  createdAt: string;
  clinicalNote?: { id: string; status: NoteStatus } | null;
}

export interface PaginatedResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  [key: string]: unknown;
}
