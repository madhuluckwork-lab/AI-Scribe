import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { COLORS } from "../lib/constants";
import { format } from "date-fns";

interface NoteCardProps {
  title: string;
  status: string;
  encounterType: string;
  patientInitials: string | null;
  createdAt: string;
  onPress: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#f59e0b",
  REVIEW: COLORS.primary,
  SIGNED: COLORS.success,
};

export function NoteCard({
  title,
  status,
  encounterType,
  patientInitials,
  createdAt,
  onPress,
}: NoteCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {patientInitials && (
            <View style={styles.initialsCircle}>
              <Text style={styles.initials}>{patientInitials}</Text>
            </View>
          )}
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.meta}>
              {encounterType.replace(/_/g, " ")} {"\u00b7"}{" "}
              {format(new Date(createdAt), "MMM d, h:mm a")}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: (STATUS_COLORS[status] || COLORS.textMuted) + "20" },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: STATUS_COLORS[status] || COLORS.textMuted },
            ]}
          >
            {status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  initialsCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  initials: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  meta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
