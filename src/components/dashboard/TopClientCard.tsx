import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import { useAppSelector } from "@/store/hooks";
import {
  selectDashboardIsLoading,
  selectDashboardTopClient,
} from "@/store/dashboard/dashboard.slice";

export default function TopClientCard() {
  const topClient = useAppSelector(selectDashboardTopClient);
  const isLoading = useAppSelector(selectDashboardIsLoading);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Loyalty</Text>
          <Text style={styles.sectionTitle}>Top client</Text>
        </View>
        {topClient ? (
          <TouchableOpacity onPress={() => router.push(`/clients/${topClient.id}` as Href)}>
            <Text style={styles.link}>Open profile</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.card}>
          <View style={styles.avatarSkeleton} />
          <View style={styles.copy}>
            <View style={styles.nameSkeleton} />
            <View style={styles.lineSkeleton} />
          </View>
        </View>
      ) : !topClient ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No client activity yet.</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{topClient.initials}</Text>
          </View>
          <View style={styles.copy}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{topClient.name}</Text>
              {topClient.tag ? (
                <View style={styles.vipBadge}>
                  <Ionicons name="star" size={10} color={Colors.goldDark} />
                  <Text style={styles.vipText}>{topClient.tag}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.meta}>
              {topClient.visits} visits - last visit {topClient.lastVisitLabel}
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${topClient.progressPct}%` }]} />
            </View>
            <Text style={styles.rewardText}>
              {topClient.nextRewardPoints} points to next reward
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  eyebrow: {
    color: Colors.text2,
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
  },
  link: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "500",
  },
  card: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.md,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#FBF3E5",
    borderColor: "rgba(199,168,109,0.3)",
    borderRadius: Radius.lg,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  avatarText: {
    color: Colors.goldDark,
    fontSize: 16,
    fontWeight: "800",
  },
  copy: {
    flex: 1,
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  name: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "700",
  },
  vipBadge: {
    alignItems: "center",
    backgroundColor: "#FBF3E5",
    borderRadius: 999,
    flexDirection: "row",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  vipText: {
    color: Colors.goldDark,
    fontSize: 9,
    fontWeight: "800",
  },
  meta: {
    color: Colors.text2,
    fontSize: 11,
    marginTop: 4,
  },
  progressTrack: {
    backgroundColor: Colors.bg2,
    borderRadius: 999,
    height: 7,
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: Colors.gold,
    borderRadius: 999,
    height: "100%",
  },
  rewardText: {
    color: Colors.text2,
    fontSize: 10,
    marginTop: 6,
  },
  avatarSkeleton: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    height: 56,
    width: 56,
  },
  nameSkeleton: {
    backgroundColor: Colors.bg2,
    borderRadius: 999,
    height: 14,
    width: "58%",
  },
  lineSkeleton: {
    backgroundColor: Colors.bg2,
    borderRadius: 999,
    height: 11,
    marginTop: 8,
    width: "74%",
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 88,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  emptyText: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
});
