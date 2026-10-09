import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { matchesTeamSearch, type StaffMember } from "@/data/teamData";
import { getApiErrorMessage } from "@/services/api";
import { staffCalendarAccessService } from "@/services/staffCalendarAccess.service";
import { staffService } from "@/services/staff.service";
import { useThemeColors } from "@/theme/ThemeProvider";

const CALENDAR_ACCESS_HELPER_TEXT =
  "Lets staff book and bill Quick Sales from their Calendar in the SalonOX app. Changes save right away and don't affect the web app.";

const loadAllStaff = async () => {
  const members: StaffMember[] = [];
  for (let page = 1; ; page++) {
    const result = await staffService.getStaff({ page, limit: 100 });
    members.push(...result.staffMembers);
    if (!result.pagination.hasMore || result.staffMembers.length === 0) break;
  }
  return members;
};

// Owner screen (Quick Actions → Staff Permissions): every staff member's
// mobile-only permissions in one place. Currently: Calendar & Quick Sale access.
export function StaffPermissionsScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [access, setAccess] = useState<Record<string, boolean>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async (mode: "initial" | "refresh") => {
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [members, accessByStaffId] = await Promise.all([
        loadAllStaff(),
        staffCalendarAccessService.listStaffCalendarAccess(),
      ]);
      setStaff(members);
      setAccess(accessByStaffId);
      setRowErrors({});
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load("initial");
  }, [load]);

  const toggleAccess = useCallback(async (staffId: string, enabled: boolean) => {
    setAccess((current) => ({ ...current, [staffId]: enabled }));
    setSavingIds((current) => new Set(current).add(staffId));
    setRowErrors((current) => {
      const next = { ...current };
      delete next[staffId];
      return next;
    });

    try {
      const saved = await staffCalendarAccessService.setStaffCalendarAccess(staffId, enabled);
      setAccess((current) => ({ ...current, [staffId]: saved }));
    } catch (saveError) {
      setAccess((current) => ({ ...current, [staffId]: !enabled }));
      setRowErrors((current) => ({ ...current, [staffId]: getApiErrorMessage(saveError) }));
    } finally {
      setSavingIds((current) => {
        const next = new Set(current);
        next.delete(staffId);
        return next;
      });
    }
  }, []);

  const visibleStaff = useMemo(
    () => (search.trim() ? staff.filter((member) => matchesTeamSearch(member, search)) : staff),
    [search, staff],
  );
  const enabledCount = staff.filter((member) => access[member.id]).length;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <View style={styles.header}>
        <AppBackButton fallbackHref="/dashboard" />
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.title}>Staff Permissions</Text>
          <Text style={styles.subtitle}>Control what each staff member can do in the app</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl colors={[Colors.primary]} onRefresh={() => void load("refresh")} refreshing={refreshing} tintColor={Colors.primary} />}
      >
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons color={Colors.primary} name="calendar-outline" size={20} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>Calendar &amp; Quick Sale access</Text>
            <Text style={styles.infoText}>{CALENDAR_ACCESS_HELPER_TEXT}</Text>
            {!loading && !error ? (
              <Text style={styles.infoCount}>{enabledCount} of {staff.length} staff enabled</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.searchField}>
          <Ionicons color={Colors.hint} name="search-outline" size={17} />
          <TextInput
            onChangeText={setSearch}
            placeholder="Search staff"
            placeholderTextColor={Colors.hint}
            style={styles.searchInput}
            value={search}
          />
          {search ? (
            <TouchableOpacity accessibilityLabel="Clear search" onPress={() => setSearch("")}>
              <Ionicons color={Colors.hint} name="close-circle" size={18} />
            </TouchableOpacity>
          ) : null}
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} size="large" style={styles.loader} />
        ) : error ? (
          <View style={styles.stateCard}>
            <Ionicons color={Colors.error} name="cloud-offline-outline" size={28} />
            <Text style={styles.stateTitle}>Unable to load staff permissions</Text>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity activeOpacity={0.86} onPress={() => void load("initial")} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : visibleStaff.length === 0 ? (
          <View style={styles.stateCard}>
            <Ionicons color={Colors.hint} name="people-outline" size={28} />
            <Text style={styles.stateTitle}>{staff.length ? "No staff match your search" : "No staff yet"}</Text>
          </View>
        ) : (
          visibleStaff.map((member) => {
            const saving = savingIds.has(member.id);
            const inactive = member.status === "Inactive";
            const note = inactive ? "Inactive — the switch applies once they're reactivated." : null;

            return (
              <View key={member.id} style={styles.staffCard}>
                <View style={styles.staffRow}>
                  <View style={[styles.avatar, { backgroundColor: member.avatarBg || Colors.bg2 }]}>
                    <Text style={[styles.avatarText, { color: member.avatarColor || Colors.primaryDark }]}>{member.initials}</Text>
                  </View>
                  <View style={styles.staffCopy}>
                    <Text numberOfLines={1} style={styles.staffName}>{member.name}</Text>
                    <Text numberOfLines={1} style={styles.staffRole}>{member.designation || member.role || "Staff"}</Text>
                  </View>
                  {saving ? <ActivityIndicator color={Colors.primary} size="small" /> : null}
                  <Switch
                    accessibilityLabel={`Calendar and Quick Sale access for ${member.name}`}
                    disabled={saving}
                    onValueChange={(value) => void toggleAccess(member.id, value)}
                    thumbColor="#FFFFFF"
                    trackColor={{ false: Colors.border, true: Colors.primary }}
                    value={access[member.id] === true}
                  />
                </View>
                <Text style={styles.permissionLabel}>Calendar &amp; Quick Sale</Text>
                {note ? <Text style={styles.note}>{note}</Text> : null}
                {rowErrors[member.id] ? <Text style={styles.rowError}>{rowErrors[member.id]}</Text> : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingVertical: Spacing.md,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: Colors.heading,
    fontSize: AppLayout.headerTitleFontSize,
    fontWeight: AppLayout.screenTitleFontWeight,
  },
  subtitle: {
    color: Colors.text2,
    fontSize: AppLayout.headerSubtitleFontSize,
    lineHeight: 20,
    marginTop: AppLayout.headerSubtitleMarginTop,
  },
  content: {
    gap: Spacing.md,
    paddingBottom: AppLayout.contentBottomPadding,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    padding: AppLayout.cardPadding,
  },
  infoIcon: {
    alignItems: "center",
    backgroundColor: Colors.backgroundSelected,
    borderRadius: AppRadius.control,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  infoCopy: {
    flex: 1,
  },
  infoTitle: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "800",
  },
  infoText: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  infoCount: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    marginTop: Spacing.sm,
  },
  searchField: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 46,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    color: Colors.heading,
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
  },
  loader: {
    marginTop: Spacing.xl,
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  stateTitle: {
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  stateText: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: AppRadius.pill,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  staffCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    padding: AppLayout.cardPadding,
  },
  staffRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "800",
  },
  staffCopy: {
    flex: 1,
    minWidth: 0,
  },
  staffName: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "800",
  },
  staffRole: {
    color: Colors.text2,
    fontSize: 12,
    marginTop: 2,
  },
  permissionLabel: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
    marginTop: Spacing.sm,
  },
  note: {
    color: Colors.warning,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    marginTop: 4,
  },
  rowError: {
    color: Colors.error,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
});
