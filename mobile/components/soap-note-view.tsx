import { View, Text, StyleSheet, ScrollView } from "react-native";
import { COLORS } from "../lib/constants";

interface SoapNoteViewProps {
  content: Record<string, unknown>;
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

const SECTION_ORDER = [
  "chiefComplaint",
  "historyOfPresentIllness",
  "pastMedicalHistory",
  "medications",
  "socialHistory",
  "familyHistory",
  "reviewOfSystems",
  "physicalExam",
  "assessmentAndPlan",
];

export function SoapNoteView({ content }: SoapNoteViewProps) {
  return (
    <View style={styles.container}>
      {SECTION_ORDER.map((key) => {
        const value = content[key];
        if (!value) return null;

        const text = typeof value === "string" ? value : JSON.stringify(value);

        return (
          <View key={key} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {SECTION_LABELS[key] || key}
            </Text>
            <Text style={styles.sectionContent}>{text}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.text,
  },
});
