import { StateCard } from "@/features/appointments/components/shared/StateCard";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { BlockedTimeEntry } from "@/types/staffBlockedTimes";
import { useMemo } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export function ReadOnlyBlockedTimesSummary({
  blockedTimes,
  error,
  loading,
  onRetry,
}: {
  blockedTimes: BlockedTimeEntry[];
  error: string | null;
  loading: boolean;
  onRetry: () => void;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const sortedBlockedTimes = useMemo(
    () => [...blockedTimes].sort((left, right) => (left.startAt ?? "").localeCompare(right.startAt ?? "")),
    [blockedTimes],
  );

  return (
    <View style={styles.availabilityCard}>
      <View style={styles.availabilityHeader}>
        <Text style={styles.availabilityTitle}>Blocked Times</Text>
        {loading ? <ActivityIndicator color={Colors.primary} size="small" /> : null}
      </View>
      {error ? (
        <StateCard
          actionLabel="Retry"
          icon="cloud-offline-outline"
          message={error}
          onAction={onRetry}
          title="Unable to load blocked times"
          tone="error"
        />
      ) : null}
      {!error && loading ? <Text style={styles.fieldHint}>Loading blocked times...</Text> : null}
      {!error && !loading && sortedBlockedTimes.length === 0 ? (
        <Text style={styles.fieldHint}>No blocked times for this date.</Text>
      ) : null}
      {!error && sortedBlockedTimes.length > 0 ? (
        <View style={styles.availabilityRows}>
          {sortedBlockedTimes.map((blockedTime) => (
            <View key={blockedTime.id} style={styles.availabilityRow}>
              <Text ellipsizeMode="tail" numberOfLines={1} style={styles.availabilityRowLabel}>
                {blockedTime.reason || "Blocked time"}
              </Text>
              <Text ellipsizeMode="tail" numberOfLines={1} style={styles.availabilityRowValue}>
                {[blockedTime.startAt, blockedTime.endAt].filter(Boolean).join(" — ") || "-"}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
