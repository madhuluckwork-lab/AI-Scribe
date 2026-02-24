import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { COLORS } from "../lib/constants";

interface ProcessingStatusProps {
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  TRANSCRIBING: "Transcribing audio...",
  GENERATING_NOTE: "Generating clinical note...",
  REVIEW: "Ready for review",
  ERROR: "Processing failed",
};

export function ProcessingStatus({ status }: ProcessingStatusProps) {
  const isProcessing = status === "TRANSCRIBING" || status === "GENERATING_NOTE";

  return (
    <View style={styles.container}>
      {isProcessing && (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.spinner} />
      )}
      <Text style={[styles.text, status === "ERROR" && styles.errorText]}>
        {STATUS_LABELS[status] || status}
      </Text>
      {isProcessing && (
        <Text style={styles.hint}>This usually takes 30-60 seconds</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  spinner: {
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
  },
  errorText: {
    color: COLORS.error,
  },
  hint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
});
