import { Text, StyleSheet } from "react-native";
import { COLORS } from "../lib/constants";

interface RecordingTimerProps {
  seconds: number;
}

export function RecordingTimer({ seconds }: RecordingTimerProps) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <Text style={styles.timer}>
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </Text>
  );
}

const styles = StyleSheet.create({
  timer: {
    fontSize: 48,
    fontWeight: "200",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
    letterSpacing: 2,
  },
});
