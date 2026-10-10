import { Text } from "@/components/ui/AppTypography";
import { appAlert as Alert } from "@/services/appAlert";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { type StaffAvailability, type StaffStatus } from "@/data/teamData";
import {
  EmergencyContactsSection,
  StaffAddressSection,
  StaffFutureSections,
  useStaffDetails,
} from "@/features/staff";
import { useStaffPerformance, type PerformancePeriod } from "@/features/staff/hooks/useStaffPerformance";
import type { AttendanceStatusKey } from "@/types/attendance";
import { useAppToast } from "@/hooks/useAppToast";
import { deleteStaffThunk, setStaffActiveStatusThunk } from "@/middleware/staff/staff.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectStaffActiveStatusToggling,
  selectStaffDeletingIds,
} from "@/store/staff/staff.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import { canManageStaffLifecycle } from "@/utils/userProfile";

const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString("en-IN")}`;

const PERFORMANCE_PERIODS: { key: PerformancePeriod; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

const PERIOD_EMPTY_TEXT: Record<PerformancePeriod, string> = {
  month: "this month",
  today: "today",
  week: "this week",
};

const ATTENDANCE_LABELS: Record<AttendanceStatusKey, string> = {
  absent: "Absent",
  halfDay: "Half Day",
  late: "Late",
  notMarked: "Not Marked",
  onLeave: "On Leave",
  present: "Present",
};

const formatRangeDate = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/** "Unavailable" when that metric's source failed to load. */
const metric = <T,>(value: T | null | undefined, format: (value: T) => string) =>
  value === null || value === undefined ? "Unavailable" : format(value);

function MetricCard({ label, styles, value }: { label: string; styles: ReturnType<typeof createStyles>; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function getRejectedMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

const getAvailabilityPalette = (availability: StaffAvailability, Colors: ThemeColors) => {
  switch (availability) {
    case "Available":
      return { backgroundColor: Colors.successBg, color: Colors.success };
    case "Busy":
      return { backgroundColor: Colors.warningBg, color: Colors.warning };
    case "On Leave":
      return { backgroundColor: Colors.errorBg, color: Colors.error };
    case "Offline":
    default:
      return { backgroundColor: Colors.bg2, color: Colors.text2 };
  }
};

const getStatusPalette = (status: StaffStatus, Colors: ThemeColors) => {
  switch (status) {
    case "Available":
      return { backgroundColor: Colors.successBg, color: Colors.success };
    case "Busy":
      return { backgroundColor: Colors.warningBg, color: Colors.warning };
    case "Break":
      return { backgroundColor: Colors.warningBg, color: Colors.warning };
    case "On Leave":
      return { backgroundColor: Colors.errorBg, color: Colors.error };
    case "Inactive":
      return { backgroundColor: Colors.bg2, color: Colors.text2 };
    case "Working":
    default:
      return { backgroundColor: Colors.bg2, color: Colors.primaryDark };
  }
};

function DetailRow({ label, value }: { label: string; value: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function StaffProfileScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { detailsError, detailsLoading, staffMember: storedStaffMember } = useStaffDetails(id);
  const staffMember = storedStaffMember;
  const [period, setPeriod] = useState<PerformancePeriod>("today");
  const performance = useStaffPerformance(staffMember, period);
  const perf = performance.data;
  const performanceHasError = Boolean(performance.errors && Object.values(performance.errors).some(Boolean));
  // Empty only when every source loaded and none has activity for the period.
  const performanceIsEmpty = Boolean(perf && !performanceHasError && perf.appointments === 0 && perf.completed === 0 &&
    perf.revenue === 0 && (period === "today" ? perf.todayStatus === "notMarked" : perf.daysPresent === 0) &&
    perf.rating?.totalReviews === 0);
  const performanceRangeLabel = period === "today"
    ? formatRangeDate(performance.range.start_date)
    : `${formatRangeDate(performance.range.start_date)} – ${formatRangeDate(performance.range.end_date)}`;
  const dispatch = useAppDispatch();
  const toast = useAppToast();
  const currentUser = useAppSelector(selectCurrentUser);
  const deletingStaffIds = useAppSelector(selectStaffDeletingIds);
  const isTogglingActive = useAppSelector((state) => selectStaffActiveStatusToggling(state, id));

  const canManageLifecycle = canManageStaffLifecycle(currentUser?.role);
  const isDeleting = Boolean(id && deletingStaffIds.includes(id));

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/team" as Href);
  };

  const handleConfirmToggleActive = async (nextStatus: "active" | "inactive") => {
    if (!id || !staffMember || isTogglingActive) {
      return;
    }

    const resultAction = await dispatch(setStaffActiveStatusThunk({ nextStatus, staffId: id }));

    if (setStaffActiveStatusThunk.rejected.match(resultAction)) {
      Alert.alert(
        nextStatus === "inactive" ? "Unable to deactivate staff" : "Unable to reactivate staff",
        getRejectedMessage(resultAction.payload, "Something went wrong. Please try again."),
      );
      return;
    }

    toast.showSuccess(
      nextStatus === "inactive" ? "Staff deactivated successfully." : "Staff activated successfully.",
    );
  };

  const handleToggleActive = () => {
    if (!staffMember) {
      return;
    }

    if (!canManageLifecycle) {
      Alert.alert("Permission required", "You don't have permission to change a staff member's status.");
      return;
    }

    const isCurrentlyInactive = staffMember.status === "Inactive";
    const nextStatus = isCurrentlyInactive ? "active" : "inactive";

    Alert.alert(
      isCurrentlyInactive ? "Reactivate Staff" : "Deactivate Staff",
      isCurrentlyInactive
        ? `Reactivate ${staffMember.name}? They will be marked available again.`
        : `Deactivate ${staffMember.name}? They won't be assignable to new bookings until reactivated.`,
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: () => void handleConfirmToggleActive(nextStatus),
          text: isCurrentlyInactive ? "Reactivate" : "Deactivate",
        },
      ],
    );
  };

  const handleConfirmDelete = async () => {
    if (!id || !staffMember) {
      return;
    }

    const resultAction = await dispatch(deleteStaffThunk(id));

    if (deleteStaffThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to delete staff",
        getRejectedMessage(resultAction.payload, "Something went wrong. Please try again."),
      );
      return;
    }

    toast.showSuccess("Staff deleted successfully.");
    handleBack();
  };

  const handleDelete = () => {
    if (!staffMember) {
      return;
    }

    if (!canManageLifecycle) {
      Alert.alert("Permission required", "You don't have permission to delete staff members.");
      return;
    }

    Alert.alert(
      "Delete Staff",
      `Are you sure you want to delete ${staffMember.name}? This action cannot be undone.`,
      [
        { style: "cancel", text: "Cancel" },
        { onPress: () => void handleConfirmDelete(), style: "destructive", text: "Delete" },
      ],
    );
  };

  if (detailsLoading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.missingWrap}>
          <View style={styles.header}>
            <TouchableOpacity activeOpacity={0.84} hitSlop={AppLayout.headerActionHitSlop} onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={18} color={Colors.primaryDark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Staff Profile</Text>
            <View style={styles.headerActionPlaceholder} />
          </View>
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (detailsError) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.missingWrap}>
          <View style={styles.header}>
            <TouchableOpacity activeOpacity={0.84} hitSlop={AppLayout.headerActionHitSlop} onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={18} color={Colors.primaryDark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Staff Profile</Text>
            <View style={styles.headerActionPlaceholder} />
          </View>
          <View style={styles.missingCard}>
            <Text style={styles.missingTitle}>Unable to load staff</Text>
            <Text style={styles.missingText}>{detailsError}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!staffMember) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.missingWrap}>
          <View style={styles.header}>
            <TouchableOpacity activeOpacity={0.84} hitSlop={AppLayout.headerActionHitSlop} onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={18} color={Colors.primaryDark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Staff Profile</Text>
            <View style={styles.headerActionPlaceholder} />
          </View>

          <View style={styles.missingCard}>
            <View style={styles.missingIllustration}>
              <Ionicons name="person-outline" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.missingTitle}>Staff member not found</Text>
            <Text style={styles.missingText}>
              The selected profile is unavailable. Return to the Staff screen and choose another staff member.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const statusPalette = getStatusPalette(staffMember.status, Colors);
  const availabilityPalette = getAvailabilityPalette(staffMember.availability, Colors);
  const isInactive = staffMember.status === "Inactive";

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.84} hitSlop={AppLayout.headerActionHitSlop} onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={18} color={Colors.primaryDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Staff Profile</Text>

          <View style={styles.headerActionPlaceholder} />
        </View>

        <View style={styles.heroCard}>
          <View style={[styles.avatar, { backgroundColor: staffMember.avatarBg }]}>
            <Text style={[styles.avatarText, { color: staffMember.avatarColor }]}>{staffMember.initials}</Text>
          </View>
          <Text style={styles.name}>{staffMember.name}</Text>
          <Text style={styles.role}>{staffMember.role}</Text>

          <View style={styles.heroMetaRow}>
            <View style={[styles.heroBadge, { backgroundColor: statusPalette.backgroundColor }]}>
              <Text style={[styles.heroBadgeText, { color: statusPalette.color }]}>{staffMember.status}</Text>
            </View>
            <View style={[styles.heroBadge, { backgroundColor: availabilityPalette.backgroundColor }]}>
              <Text style={[styles.heroBadgeText, { color: availabilityPalette.color }]}>
                {staffMember.availability}
              </Text>
            </View>
          </View>

          <View style={styles.quickActionRow}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/team/${id}/edit` as Href)} style={styles.quickAction}>
              <Ionicons name="create-outline" size={16} color={Colors.primaryDark} />
              <Text style={styles.quickActionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isTogglingActive || isDeleting}
              onPress={handleToggleActive}
              style={[styles.quickAction, (isTogglingActive || isDeleting) && styles.quickActionDisabled]}
            >
              <Ionicons
                name={isInactive ? "play-circle-outline" : "pause-circle-outline"}
                size={16}
                color={Colors.warning}
              />
              <Text style={styles.quickActionText}>{isInactive ? "Reactivate" : "Deactivate"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isTogglingActive || isDeleting}
              onPress={handleDelete}
              style={[styles.quickAction, (isTogglingActive || isDeleting) && styles.quickActionDisabled]}
            >
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
              <Text style={styles.quickActionText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Contact & Work Details</Text>
          <DetailRow label="Phone" value={staffMember.phone} />
          <DetailRow label="Email" value={staffMember.email} />
          <DetailRow label="Gender" value={staffMember.gender} />
          <DetailRow label="Joining Date" value={staffMember.joiningDate} />
          <DetailRow label="Working Hours" value={staffMember.workingHours} />
        </View>

        <StaffAddressSection staffId={id} />

        <EmergencyContactsSection staffId={id} />

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Assigned Services</Text>
          <View style={styles.serviceChipRow}>
            {staffMember.assignedServices.map((service) => (
              <View key={service} style={styles.serviceChip}>
                <Text style={styles.serviceChipText}>{service}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>
          <View style={styles.periodRow}>
            {PERFORMANCE_PERIODS.map((option) => {
              const active = option.key === period;
              return (
                <TouchableOpacity
                  key={option.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  activeOpacity={0.84}
                  onPress={() => setPeriod(option.key)}
                  style={[styles.periodChip, active && styles.periodChipActive]}
                >
                  <Text style={[styles.periodChipText, active && styles.periodChipTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.metricLabel}>{performanceRangeLabel}</Text>

          {performance.loading ? (
            <View style={styles.metricsLoading}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.metricLabel}>Loading performance...</Text>
            </View>
          ) : performanceIsEmpty ? (
            <View style={styles.metricsEmpty}>
              <Ionicons color={Colors.text2} name="stats-chart-outline" size={28} />
              <Text style={styles.metricsEmptyTitle}>No performance data</Text>
              <Text style={styles.metricLabel}>
                {staffMember.name} has no appointments, sales, attendance or reviews {PERIOD_EMPTY_TEXT[period]}.
              </Text>
            </View>
          ) : (
            <View style={styles.metricsGrid}>
              <MetricCard label="Appointments" styles={styles} value={metric(perf?.appointments, (value) => String(value))} />
              <MetricCard label="Completed Services" styles={styles} value={metric(perf?.completed, (value) => String(value))} />
              <MetricCard label="Revenue" styles={styles} value={metric(perf?.revenue, formatCurrency)} />
              <MetricCard
                label="Attendance"
                styles={styles}
                value={period === "today"
                  ? perf?.todayStatus ? ATTENDANCE_LABELS[perf.todayStatus] : "Unavailable"
                  : metric(perf?.daysPresent, (value) => `${value} day${value === 1 ? "" : "s"} present`)}
              />
              <MetricCard
                label="Customer Rating"
                styles={styles}
                value={perf?.rating
                  ? perf.rating.totalReviews > 0
                    ? `${perf.rating.averageRating.toFixed(1)} (${perf.rating.totalReviews} review${perf.rating.totalReviews === 1 ? "" : "s"})`
                    : "No reviews"
                  : "Unavailable"}
              />
            </View>
          )}
          {!performance.loading && performanceHasError ? (
            <TouchableOpacity accessibilityRole="button" onPress={() => void performance.refresh()} style={styles.metricsRetry}>
              <Text style={styles.metricLabel}>Some metrics couldn&apos;t be loaded. </Text>
              <Text style={styles.metricsRetryText}>Retry</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{staffMember.notes || "No notes added."}</Text>
        </View>

        <StaffFutureSections staffId={id} />

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  content: {
    paddingBottom: AppLayout.contentBottomPadding,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: AppLayout.headerMarginBottom,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    height: AppLayout.headerActionSize,
    justifyContent: "center",
    width: AppLayout.headerActionSize,
  },
  headerTitle: {
    color: Colors.heading,
    fontSize: AppLayout.headerTitleFontSize,
    fontWeight: AppLayout.screenTitleFontWeight,
  },
  headerActionPlaceholder: {
    width: AppLayout.headerActionSize,
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginBottom: AppLayout.sectionGap,
    padding: Spacing.xl,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  avatar: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 92,
    justifyContent: "center",
    width: 92,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "800",
  },
  name: {
    color: Colors.heading,
    fontSize: 24,
    fontWeight: "800",
    marginTop: Spacing.md,
  },
  role: {
    color: Colors.text2,
    fontSize: 14,
    marginTop: 4,
  },
  heroMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: Spacing.md,
  },
  heroBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  quickActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: Spacing.lg,
  },
  quickAction: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    minWidth: 92,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  quickActionText: {
    color: Colors.primaryDark,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },
  quickActionDisabled: {
    opacity: 0.45,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginBottom: AppLayout.sectionGap,
    padding: AppLayout.cardPadding,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  sectionTitle: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: Spacing.md,
  },
  detailRow: {
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  detailLabel: {
    color: Colors.text2,
    fontSize: 12,
  },
  detailValue: {
    color: Colors.heading,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: Spacing.md,
    textAlign: "right",
  },
  serviceChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  serviceChip: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  serviceChipText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: Spacing.sm,
  },
  periodRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: Spacing.sm,
  },
  periodChip: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  periodChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  periodChipText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
  },
  periodChipTextActive: {
    color: "#FFFFFF",
  },
  metricsLoading: {
    alignItems: "center",
    gap: 8,
    paddingVertical: Spacing.lg,
  },
  metricsEmpty: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    gap: 6,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  metricsEmptyTitle: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "800",
  },
  metricsRetry: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: Spacing.sm,
  },
  metricsRetryText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  metricCard: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    minWidth: "48.5%",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  metricValue: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "800",
  },
  metricLabel: {
    color: Colors.text2,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  notesText: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
  },
  missingWrap: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  missingCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  missingIllustration: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 76,
    justifyContent: "center",
    width: 76,
  },
  missingTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "800",
    marginTop: Spacing.md,
  },
  missingText: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  centeredContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
});
