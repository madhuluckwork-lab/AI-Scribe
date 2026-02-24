import { View, StyleSheet } from "react-native";
import { useEffect, useRef } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { COLORS } from "../lib/constants";

interface AudioVisualizerProps {
  metering: number;
  isRecording: boolean;
}

const BAR_COUNT = 30;
const MIN_HEIGHT = 4;
const MAX_HEIGHT = 80;

function Bar({ metering, index, isRecording }: { metering: number; index: number; isRecording: boolean }) {
  const height = useSharedValue(MIN_HEIGHT);

  useEffect(() => {
    if (!isRecording) {
      height.value = withTiming(MIN_HEIGHT, { duration: 300 });
      return;
    }
    // Normalize metering from [-160, 0] to [0, 1]
    const normalized = Math.max(0, (metering + 160) / 160);
    // Add variation per bar
    const variation = Math.sin(index * 0.5 + Date.now() * 0.003) * 0.3 + 0.7;
    const barHeight = MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) * normalized * variation;
    height.value = withTiming(barHeight, { duration: 100 });
  }, [metering, isRecording, index, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        animatedStyle,
        { backgroundColor: isRecording ? COLORS.primary : COLORS.textMuted },
      ]}
    />
  );
}

export function AudioVisualizer({ metering, isRecording }: AudioVisualizerProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <Bar key={i} metering={metering} index={i} isRecording={isRecording} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: MAX_HEIGHT + 20,
    gap: 3,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
});
