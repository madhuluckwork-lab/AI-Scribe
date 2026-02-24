import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { SoapNoteView } from "../../../components/soap-note-view";
import { ProcessingStatus } from "../../../components/processing-status";
import { AudioPlayer } from "../../../components/audio-player";
import { COLORS, API_URL } from "../../../lib/constants";
import type { Note } from "../../../lib/types";

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ["note", id],
    queryFn: async () => {
      const res = await api.get(`/api/notes/${id}`);
      return res.data;
    },
    refetchInterval: (query) => {
      const d = query.state.data;
      if (d?.processing) return 3000;
      return false;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load note</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Processing state
  if (data?.processing) {
    return (
      <View style={styles.centered}>
        <ProcessingStatus status={data.encounter?.status || "TRANSCRIBING"} />
      </View>
    );
  }

  const note: Note = data?.note;
  if (!note) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Note not found</Text>
      </View>
    );
  }

  const content =
    typeof note.content === "string"
      ? JSON.parse(note.content)
      : note.content;

  // Build audio URL from the encounter's audioFileKey
  const audioFileKey = (note.encounter as any)?.audioFileKey;
  const audioUrl = audioFileKey ? `${API_URL}/uploads/${audioFileKey}` : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{note.title}</Text>
        <View style={styles.metaRow}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  note.status === "SIGNED"
                    ? COLORS.success + "20"
                    : COLORS.primary + "20",
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    note.status === "SIGNED" ? COLORS.success : COLORS.primary,
                },
              ]}
            >
              {note.status}
            </Text>
          </View>
          <Text style={styles.version}>v{note.version}</Text>
        </View>
      </View>

      {/* Audio Player */}
      {audioUrl && (
        <View style={styles.audioSection}>
          <Text style={styles.sectionLabel}>Recording</Text>
          <AudioPlayer
            audioUrl={audioUrl}
            duration={note.encounter?.duration}
          />
        </View>
      )}

      <SoapNoteView content={content} />

      {/* Transcript */}
      {note.encounter?.transcription?.fullText && (
        <View style={styles.transcriptSection}>
          <Text style={styles.transcriptTitle}>Transcript</Text>
          <Text style={styles.transcriptText}>
            {note.encounter.transcription.fullText}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surface,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  version: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  audioSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    marginBottom: 12,
  },
  linkText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
  },
  transcriptSection: {
    marginTop: 24,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transcriptTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
  },
});
