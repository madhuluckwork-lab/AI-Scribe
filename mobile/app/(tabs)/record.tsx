import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAudioRecorder } from "../../hooks/use-audio-recorder";
import { AudioVisualizer } from "../../components/audio-visualizer";
import { RecordingTimer } from "../../components/recording-timer";
import { COLORS, ENCOUNTER_TYPES } from "../../lib/constants";
import { api } from "../../lib/api";

type Phase = "setup" | "recording" | "preview" | "uploading";

export default function RecordScreen() {
  const router = useRouter();
  const recorder = useAudioRecorder();
  const [phase, setPhase] = useState<Phase>("setup");
  const [encounterType, setEncounterType] = useState("GENERAL");
  const [patientInitials, setPatientInitials] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleStart = async () => {
    try {
      await recorder.startRecording();
      setPhase("recording");
    } catch {
      Alert.alert("Error", "Could not start recording. Check microphone permissions.");
    }
  };

  const handleStop = async () => {
    const uri = await recorder.stopRecording();
    if (uri) {
      setPhase("preview");
    }
  };

  const handleReRecord = () => {
    recorder.resetRecording();
    setPhase("setup");
  };

  const handleUpload = async () => {
    if (!recorder.uri) return;
    setIsUploading(true);
    setPhase("uploading");

    try {
      // Upload audio file
      const formData = new FormData();
      formData.append("file", {
        uri: recorder.uri,
        type: "audio/mp4",
        name: "recording.m4a",
      } as any);

      const uploadRes = await api.post("/api/upload/presigned", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { fileKey, blobUrl } = uploadRes.data;

      // Create encounter
      const encounterRes = await api.post("/api/encounters", {
        encounterType,
        patientInitials: patientInitials.trim() || undefined,
        audioFileKey: fileKey,
        audioBlobUrl: blobUrl,
        audioFormat: "audio/mp4",
        audioSizeBytes: 0,
        duration: recorder.duration,
      });

      const { encounterId } = encounterRes.data;

      // Navigate to note detail (will show processing status)
      recorder.resetRecording();
      setPhase("setup");
      router.push(`/(tabs)/notes/${encounterId}`);
    } catch (error: any) {
      Alert.alert(
        "Upload Failed",
        error.response?.data?.error || "Could not upload recording."
      );
      setPhase("preview");
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Setup Phase ────────────────────────────────────
  if (phase === "setup") {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>New Recording</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Encounter Type</Text>
          <View style={styles.chipRow}>
            {ENCOUNTER_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.chip,
                  encounterType === t.value && styles.chipActive,
                ]}
                onPress={() => setEncounterType(t.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    encounterType === t.value && styles.chipTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Patient Initials (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. JD"
            placeholderTextColor={COLORS.textMuted}
            value={patientInitials}
            onChangeText={(t) => setPatientInitials(t.toUpperCase().slice(0, 5))}
            maxLength={5}
            autoCapitalize="characters"
          />
        </View>

        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStart}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonIcon}>🎙</Text>
          <Text style={styles.startButtonText}>Start Recording</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── Recording Phase ────────────────────────────────
  if (phase === "recording") {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.recordingLabel}>Recording...</Text>
        <RecordingTimer seconds={recorder.duration} />
        <AudioVisualizer metering={recorder.metering} isRecording={!recorder.isPaused} />

        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={recorder.isPaused ? recorder.resumeRecording : recorder.pauseRecording}
          >
            <Text style={styles.controlIcon}>
              {recorder.isPaused ? "▶" : "⏸"}
            </Text>
            <Text style={styles.controlLabel}>
              {recorder.isPaused ? "Resume" : "Pause"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.stopButton]}
            onPress={handleStop}
          >
            <Text style={styles.stopIcon}>⏹</Text>
            <Text style={styles.controlLabel}>Stop</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Preview / Uploading Phase ──────────────────────
  return (
    <View style={[styles.container, styles.centerContent]}>
      {isUploading ? (
        <>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.uploadingText}>Uploading & processing...</Text>
        </>
      ) : (
        <>
          <Text style={styles.previewLabel}>Recording Complete</Text>
          <RecordingTimer seconds={recorder.duration} />

          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleReRecord}
            >
              <Text style={styles.secondaryButtonText}>Re-record</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleUpload}
            >
              <Text style={styles.primaryButtonText}>Upload & Process</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  content: {
    padding: 20,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + "10",
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: "center",
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  startButtonIcon: {
    fontSize: 24,
  },
  startButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "600",
  },
  recordingLabel: {
    fontSize: 16,
    color: COLORS.error,
    fontWeight: "600",
    marginBottom: 16,
  },
  controlsRow: {
    flexDirection: "row",
    gap: 24,
    marginTop: 32,
  },
  controlButton: {
    alignItems: "center",
    gap: 6,
  },
  controlIcon: {
    fontSize: 32,
  },
  controlLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  stopButton: {},
  stopIcon: {
    fontSize: 32,
    color: COLORS.error,
  },
  uploadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  previewLabel: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 16,
  },
  previewActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 32,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: "500",
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
  },
});
