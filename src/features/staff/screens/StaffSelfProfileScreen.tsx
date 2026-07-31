import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { EmergencyContactsSection } from "@/features/staff/components/EmergencyContactsSection";
import { StaffAddressSection } from "@/features/staff/components/StaffAddressSection";
import { StaffSectionCard } from "@/features/staff/components/StaffSectionCard";
import { StaffStateView } from "@/features/staff/components/StaffStateView";
import { useStaffDetails } from "@/features/staff/hooks/useStaffDetails";
import { selectActiveBranch } from "@/store/branch/branch.slice";
import { useAppSelector } from "@/store/hooks";
import {
  selectCurrentStaff,
  selectCurrentStaffError,
  selectCurrentStaffLoading,
} from "@/store/staff/staff.slice";
import { useThemeColors } from "@/theme/ThemeProvider";

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const displayValue = value === undefined || value === null || String(value).trim() === "" ? "-" : String(value);

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{displayValue}</Text>
    </View>
  );
}

const getResponsiveHorizontalPadding = (width = 393) => {
  if (width < 360) {
    return 16;
  }

  if (width >= 768) {
    return 40;
  }

  if (width >= 600) {
    return 32;
  }

  return AppLayout.contentHorizontalPadding;
};

const getResponsiveTitleSize = (width = 393) =>
  width < 360 ? AppLayout.headerTitleFontSize - 2 : AppLayout.headerTitleFontSize;

export function StaffSelfProfileScreen() {
  const Colors = useThemeColors();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(Colors, width), [Colors, width]);
  const currentStaff = useAppSelector(selectCurrentStaff);
  const currentStaffError = useAppSelector(selectCurrentStaffError);
  const currentStaffLoading = useAppSelector(selectCurrentStaffLoading);
  const activeBranch = useAppSelector(selectActiveBranch);
  const staffId = currentStaff?.id ?? null;
  const { detailsError, detailsLoading, refresh, staffMember } = useStaffDetails(staffId);
  const profile = staffMember ?? currentStaff;
  const loading = currentStaffLoading || detailsLoading;
  const error =
    currentStaffError ??
    (!staffId && !currentStaffLoading ? "Staff profile is not available for this session." : null) ??
    detailsError;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[Colors.primary]}
            onRefresh={refresh}
            refreshing={loading}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>My Profile</Text>
            <Text style={styles.subtitle}>Your staff account and employment details.</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => router.push("/change-password" as Href)}
            style={styles.headerAction}
          >
            <Ionicons name="key-outline" size={18} color={Colors.primaryDark} />
          </TouchableOpacity>
        </View>

        {loading && !profile ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loadingText}>Loading your profile...</Text>
          </View>
        ) : null}

        {!loading && error ? (
          <StaffStateView
            actionLabel="Retry"
            description={error}
            onAction={refresh}
            title="Unable to load profile"
            variant="error"
          />
        ) : null}

        {profile ? (
          <>
            <View style={styles.heroCard}>
              <View style={[styles.avatar, { backgroundColor: profile.avatarBg }]}>
                <Text style={[styles.avatarText, { color: profile.avatarColor }]}>{profile.initials}</Text>
              </View>
              <Text style={styles.name}>{profile.name}</Text>
              <Text style={styles.role}>{profile.role}</Text>
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{profile.status}</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{profile.availability}</Text>
                </View>
              </View>
            </View>

            <StaffSectionCard title="Basic Details">
              <DetailRow label="Full Name" value={profile.name} />
              <DetailRow label="Employee ID" value={profile.employeeCode} />
              <DetailRow label="Role" value={profile.role} />
              <DetailRow label="Gender" value={profile.gender} />
              <DetailRow label="Date of Birth" value="-" />
            </StaffSectionCard>

            <StaffSectionCard title="Contact Information">
              <DetailRow label="Email" value={profile.email} />
              <DetailRow label="Phone Number" value={profile.phone} />
              <DetailRow label="Branch" value={activeBranch?.name} />
            </StaffSectionCard>

            <StaffSectionCard title="Employment Details">
              <DetailRow label="Joining Date" value={profile.joiningDate} />
              <DetailRow label="Employment Status" value={profile.status} />
              <DetailRow label="Working Hours" value={profile.workingHours} />
              <DetailRow label="Availability" value={profile.availabilityLabel} />
            </StaffSectionCard>

            <StaffSectionCard title="Professional Information">
              <View style={styles.chipRow}>
                {profile.assignedServices.length > 0 ? (
                  profile.assignedServices.map((service) => (
                    <View key={service} style={styles.serviceChip}>
                      <Text style={styles.serviceChipText}>{service}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No assigned services returned by the API.</Text>
                )}
              </View>
            </StaffSectionCard>

            <StaffAddressSection readOnly staffId={staffId} />
            <EmergencyContactsSection readOnly staffId={staffId} />

            <StaffSectionCard title="Documents">
              <StaffStateView
                description="No integrated staff document API or upload flow exists in the current mobile layer."
                title="Documents unavailable"
              />
            </StaffSectionCard>

            <StaffSectionCard title="Account">
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => router.push("/change-password" as Href)}
                style={styles.accountButton}
              >
                <Ionicons name="key-outline" size={17} color={Colors.primaryDark} />
                <Text style={styles.accountButtonText}>Change Password</Text>
              </TouchableOpacity>
            </StaffSectionCard>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors, width = 393) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  content: {
    paddingBottom: AppLayout.contentBottomPadding,
    paddingHorizontal: getResponsiveHorizontalPadding(width),
    paddingTop: width < 360 ? Spacing.sm : Spacing.md,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: AppLayout.headerMarginBottom,
  },
  title: {
    color: Colors.heading,
    fontSize: getResponsiveTitleSize(width),
    fontWeight: AppLayout.screenTitleFontWeight,
  },
  subtitle: {
    color: Colors.text2,
    fontSize: AppLayout.headerSubtitleFontSize,
    lineHeight: 20,
    marginTop: AppLayout.headerSubtitleMarginTop,
  },
  headerAction: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    height: AppLayout.headerActionSize,
    justifyContent: "center",
    width: AppLayout.headerActionSize,
  },
  loadingCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    gap: Spacing.sm,
    marginBottom: AppLayout.sectionGap,
    padding: AppLayout.cardPadding,
  },
  loadingText: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "700",
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginBottom: AppLayout.sectionGap,
    padding: AppLayout.cardPadding,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    marginBottom: Spacing.md,
    width: 72,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "900",
  },
  name: {
    color: Colors.heading,
    fontSize: 22,
    fontWeight: "900",
  },
  role: {
    color: Colors.text2,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  badge: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
  },
  detailRow: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 36,
  },
  detailLabel: {
    color: Colors.text2,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  detailValue: {
    color: Colors.heading,
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  serviceChip: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  serviceChipText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
  },
  emptyText: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "700",
  },
  accountButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  accountButtonText: {
    color: Colors.primaryDark,
    fontSize: 14,
    fontWeight: "900",
  },
});
