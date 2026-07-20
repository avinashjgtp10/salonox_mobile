import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
import { deleteStaffThunk, updateStaffThunk } from "@/middleware/staff/staff.thunk";
import { selectStaffDeletingIds, selectStaffUpdating } from "@/store/staff/staff.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import { selectCurrentUser } from "@/store/user/user.slice";
import { canManageStaffLifecycle } from "@/utils/userProfile";

const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString("en-IN")}`;

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
  const { detailsError, detailsLoading, staffMember } = useStaffDetails(id);
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const deletingStaffIds = useAppSelector(selectStaffDeletingIds);
  const staffUpdating = useAppSelector(selectStaffUpdating);

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
    if (!id || !staffMember) {
      return;
    }

    const resultAction = await dispatch(
      updateStaffThunk({ staffId: id, updates: { status: nextStatus } }),
    );

    if (updateStaffThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to update staff",
        getRejectedMessage(resultAction.payload, "Something went wrong. Please try again."),
      );
      return;
    }

    Alert.alert(
      nextStatus === "inactive" ? "Staff deactivated" : "Staff reactivated",
      resultAction.payload.message ??
        `${staffMember.name} has been ${nextStatus === "inactive" ? "deactivated" : "reactivated"}.`,
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

    Alert.alert("Staff deleted", resultAction.payload.message ?? `${staffMember.name} has been removed.`);
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
            <TouchableOpacity activeOpacity={0.84} onPress={handleBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={18} color={Colors.primaryDark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Staff Profile</Text>
            <View style={[styles.headerAction, { opacity: 0 }]} />
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
            <TouchableOpacity activeOpacity={0.84} onPress={handleBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={18} color={Colors.primaryDark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Staff Profile</Text>
            <View style={[styles.headerAction, { opacity: 0 }]} />
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
            <TouchableOpacity activeOpacity={0.84} onPress={handleBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={18} color={Colors.primaryDark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Staff Profile</Text>
            <View style={[styles.headerAction, { opacity: 0 }]} />
          </View>

          <View style={styles.missingCard}>
            <View style={styles.missingIllustration}>
              <Ionicons name="person-outline" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.missingTitle}>Staff member not found</Text>
            <Text style={styles.missingText}>
              The selected profile is unavailable. Return to the Team screen and choose another staff member.
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
          <TouchableOpacity activeOpacity={0.84} onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={18} color={Colors.primaryDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Staff Profile</Text>
          <TouchableOpacity activeOpacity={0.84} onPress={() => router.push(`/team/${id}/edit` as Href)} style={styles.headerAction}>
            <Ionicons name="create-outline" size={17} color={Colors.primaryDark} />
          </TouchableOpacity>
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
              disabled={staffUpdating || isDeleting}
              onPress={handleToggleActive}
              style={[styles.quickAction, (staffUpdating || isDeleting) && styles.quickActionDisabled]}
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
              disabled={staffUpdating || isDeleting}
              onPress={handleDelete}
              style={[styles.quickAction, (staffUpdating || isDeleting) && styles.quickActionDisabled]}
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
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{staffMember.todayAppointments}</Text>
              <Text style={styles.metricLabel}>Today&apos;s Appointments</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{formatCurrency(staffMember.weeklyRevenue)}</Text>
              <Text style={styles.metricLabel}>Weekly Revenue</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{formatCurrency(staffMember.monthlyRevenue)}</Text>
              <Text style={styles.metricLabel}>Monthly Revenue</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{staffMember.attendance}</Text>
              <Text style={styles.metricLabel}>Attendance</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{staffMember.leaveBalance}</Text>
              <Text style={styles.metricLabel}>Leave Balance</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{staffMember.averageRating.toFixed(1)}</Text>
              <Text style={styles.metricLabel}>Customer Rating</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{formatCurrency(staffMember.todayRevenue)}</Text>
              <Text style={styles.metricLabel}>Revenue Today</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{staffMember.servicesCompleted}</Text>
              <Text style={styles.metricLabel}>Completed Services</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{staffMember.notes || "No notes added."}</Text>
        </View>

        <StaffFutureSections staffId={id} />

        <View style={styles.bottomActionRow}>
          <TouchableOpacity activeOpacity={0.86} onPress={() => router.push(`/team/${id}/edit` as Href)} style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit Staff</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.86}
            disabled={staffUpdating || isDeleting}
            onPress={handleToggleActive}
            style={[styles.secondaryButton, (staffUpdating || isDeleting) && styles.buttonDisabled]}
          >
            {staffUpdating ? (
              <ActivityIndicator color={Colors.primaryDark} size="small" />
            ) : (
              <Text style={styles.secondaryButtonText}>
                {isInactive ? "Reactivate Staff" : "Deactivate Staff"}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.86}
            disabled={staffUpdating || isDeleting}
            onPress={handleDelete}
            style={[styles.deleteButton, (staffUpdating || isDeleting) && styles.buttonDisabled]}
          >
            {isDeleting ? (
              <ActivityIndicator color={Colors.error} size="small" />
            ) : (
              <Text style={styles.deleteButtonText}>Delete Staff</Text>
            )}
          </TouchableOpacity>
        </View>
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
  sectionHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  sectionTitleInline: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
  },
  addMiniButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 4,
    minHeight: 34,
    paddingHorizontal: 12,
  },
  addMiniButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  emptyContactBox: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  emptyContactTitle: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  emptyContactText: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  contactList: {
    gap: 10,
  },
  emergencyContactRow: {
    alignItems: "flex-start",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  contactName: {
    color: Colors.heading,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  primaryPill: {
    backgroundColor: Colors.successBg,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  primaryPillText: {
    color: Colors.success,
    fontSize: 10,
    fontWeight: "800",
  },
  contactMeta: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
  },
  contactPhone: {
    color: Colors.heading,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
  },
  contactSubtle: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  editMiniButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 12,
  },
  editMiniButtonText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
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
  bottomActionRow: {
    gap: 10,
  },
  editButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    minHeight: 48,
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    justifyContent: "center",
    minHeight: 48,
  },
  secondaryButtonText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.full,
    justifyContent: "center",
    minHeight: 48,
    marginBottom: Spacing.md,
  },
  deleteButtonText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  modalOverlay: {
    backgroundColor: "rgba(17, 24, 20, 0.36)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalKeyboardAvoiding: {
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: "90%",
    paddingBottom: Spacing.lg,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    height: 4,
    marginBottom: Spacing.md,
    width: 42,
  },
  sheetHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  sheetHeaderCopy: {
    flex: 1,
  },
  sheetTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "800",
  },
  sheetSubtitle: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  sheetCloseButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: AppRadius.control,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  formContent: {
    paddingTop: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    color: Colors.heading,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    color: Colors.heading,
    fontSize: 14,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  textArea: {
    minHeight: 86,
    paddingTop: 13,
    textAlignVertical: "top",
  },
  formError: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  formHint: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  sheetFooter: {
    flexDirection: "row",
    gap: 10,
    paddingTop: Spacing.md,
  },
  cancelSheetButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  cancelSheetButtonText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
  },
  saveSheetButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  saveSheetButtonDisabled: {
    opacity: 0.55,
  },
  saveSheetButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
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
