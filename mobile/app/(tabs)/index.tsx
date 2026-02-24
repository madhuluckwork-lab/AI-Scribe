import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { api } from "../../lib/api";
import { StatCard } from "../../components/stat-card";
import { NoteCard } from "../../components/note-card";
import { COLORS } from "../../lib/constants";
import type { DashboardStats } from "../../lib/types";

export default function DashboardScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useQuery<DashboardStats>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await api.get("/api/dashboard");
      return res.data;
    },
  });

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={COLORS.primary}
        />
      }
      data={data?.recentNotes || []}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <>
          <View style={styles.statsRow}>
            <StatCard
              title="Encounters"
              value={data?.totalEncounters ?? 0}
              icon="📋"
            />
            <StatCard
              title="This Week"
              value={data?.notesThisWeek ?? 0}
              icon="📝"
            />
            <StatCard
              title="Pending"
              value={data?.pendingReview ?? 0}
              icon="⏳"
            />
          </View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Notes</Text>
          </View>
        </>
      }
      renderItem={({ item }) => (
        <NoteCard
          title={item.title}
          status={item.status}
          encounterType={item.encounter.encounterType}
          patientInitials={item.encounter.patientInitials}
          createdAt={item.createdAt}
          onPress={() => router.push(`/(tabs)/notes/${item.id}`)}
        />
      )}
      ListEmptyComponent={
        !isLoading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No notes yet.</Text>
            <Text style={styles.emptyHint}>
              Record your first encounter to get started.
            </Text>
          </View>
        ) : null
      }
      ListFooterComponent={
        <TouchableOpacity
          style={styles.recordButton}
          onPress={() => router.push("/(tabs)/record")}
          activeOpacity={0.8}
        >
          <Text style={styles.recordButtonText}>New Recording</Text>
        </TouchableOpacity>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  content: {
    padding: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.text,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  emptyHint: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  recordButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  recordButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
