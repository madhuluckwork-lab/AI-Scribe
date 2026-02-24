export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://web-production-a70db.up.railway.app";

export const COLORS = {
  primary: "#F4891F",
  primaryDark: "#d97a1a",
  background: "#ffffff",
  surface: "#f8fafc",
  surfaceDark: "#f1f5f9",
  text: "#0f172a",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  error: "#ef4444",
  success: "#22c55e",
  white: "#ffffff",
};

export const ENCOUNTER_TYPES = [
  { label: "General", value: "GENERAL" },
  { label: "Dental Exam", value: "DENTAL_EXAM" },
  { label: "Dental Procedure", value: "DENTAL_PROCEDURE" },
  { label: "Eye Exam", value: "OPHTHAL_EXAM" },
  { label: "Eye Procedure", value: "OPHTHAL_PROCEDURE" },
  { label: "Follow-up", value: "FOLLOW_UP" },
  { label: "Initial Consult", value: "INITIAL_CONSULT" },
  { label: "Emergency", value: "EMERGENCY" },
  { label: "Telehealth", value: "TELEHEALTH" },
] as const;
