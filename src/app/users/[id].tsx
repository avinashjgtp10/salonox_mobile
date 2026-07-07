import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import { fetchUserByIdThunk, updateUserRoleThunk } from "@/middleware/users/users.thunk";
import { usersService } from "@/services/users.service";
import {
  selectUserDetail,
  selectUserDetailError,
  selectUserDetailLoading,
  selectUserRoleUpdating,
} from "@/store/users/users.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

// The backend role enum is undocumented in-repo; confirm against the dev API.
const ROLE_OPTIONS = ["admin", "owner", "manager", "staff", "receptionist"] as const;

const formatRoleLabel = (role: string) =>
  role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

const formatValue = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "-";
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function UserDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const dispatch = useAppDispatch();

  const detail = useAppSelector(selectUserDetail);
  const detailLoading = useAppSelector(selectUserDetailLoading);
  const detailError = useAppSelector(selectUserDetailError);
  const roleUpdating = useAppSelector(selectUserRoleUpdating);

  const [isRoleSheetVisible, setIsRoleSheetVisible] = useState(false);

  useEffect(() => {
    if (id) {
      void dispatch(fetchUserByIdThunk(id));
    }
  }, [id, dispatch]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/users" as Href);
  };

  // Only trust the loaded detail when it matches the requested id.
  const user = detail && detail.id === id ? detail : null;

  const handleConfirmRoleChange = async (role: string) => {
    if (!id) {
      return;
    }

    const resultAction = await dispatch(updateUserRoleThunk({ role, userId: id }));

    if (updateUserRoleThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to update role",
        resultAction.payload?.message ?? "Something went wrong. Please try again.",
      );
      return;
    }

    Alert.alert(
      "Role updated",
      resultAction.payload.message ?? `Role changed to ${formatRoleLabel(resultAction.payload.role)}.`,
    );
  };

  const handleSelectRole = (role: string) => {
    setIsRoleSheetVisible(false);

    if (!user || role.toLowerCase() === user.role.toLowerCase()) {
      return;
    }

    Alert.alert(
      "Change Role",
      `Change ${user.fullName}'s role from "${formatRoleLabel(user.role)}" to "${formatRoleLabel(role)}"?`,
      [
        { style: "cancel", text: "Cancel" },
        { onPress: () => void handleConfirmRoleChange(role), text: "Change" },
      ],
    );
  };

  const renderHeader = (showRoleAction = false) => (
    <View style={styles.headerRow}>
      <TouchableOpacity activeOpacity={0.8} onPress={handleBack} style={styles.backButton}>
        <Ionicons name="chevron-back" size={18} color={Colors.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>User Details</Text>
      {showRoleAction ? (
        <View style={styles.headerActions}>
          <TouchableOpacity
            accessibilityLabel="Edit user"
            activeOpacity={0.8}
            onPress={() => id && router.push(`/users/${id}/edit` as Href)}
            style={styles.backButton}
          >
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Change user role"
            activeOpacity={0.8}
            disabled={roleUpdating}
            onPress={() => setIsRoleSheetVisible(true)}
            style={styles.backButton}
          >
            {roleUpdating ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Ionicons name="shield-half-outline" size={18} color={Colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.backButton, { opacity: 0 }]} />
      )}
    </View>
  );

  if (detailLoading && !user) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <View style={styles.stateWrap}>
          {renderHeader()}
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (detailError && !user) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <View style={styles.stateWrap}>
          {renderHeader()}
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Unable to load user</Text>
            <Text style={styles.stateSubtitle}>{detailError}</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => id && dispatch(fetchUserByIdThunk(id))}
              style={styles.stateButton}
            >
              <Text style={styles.stateButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <View style={styles.stateWrap}>
          {renderHeader()}
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>User not found</Text>
            <Text style={styles.stateSubtitle}>This user could not be found.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const avatarTone = usersService.getAvatarTone(user.id);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {renderHeader(true)}

        <View style={styles.heroCard}>
          {user.avatarUrl ? (
            <Image contentFit="cover" source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: avatarTone.background }]}>
              <Text style={[styles.avatarText, { color: avatarTone.color }]}>{user.initials}</Text>
            </View>
          )}
          <Text style={styles.userName}>{formatValue(user.fullName)}</Text>
          {user.email !== "-" ? <Text style={styles.userEmail}>{user.email}</Text> : null}
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.statusBadge,
                user.isActive ? styles.statusBadgeActive : styles.statusBadgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  user.isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive,
                ]}
              >
                {user.status}
              </Text>
            </View>
            {user.isVerified ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            ) : null}
          </View>
        </View>

        <Section title="User Information">
          <DetailRow label="Full Name" value={formatValue(user.fullName)} />
          <DetailRow label="Email" value={formatValue(user.email)} />
          <DetailRow label="Phone" value={formatValue(user.phone)} />
          <DetailRow label="Role" value={formatValue(user.role)} />
          <DetailRow label="Status" value={formatValue(user.status)} />
          {user.isVerified !== null ? (
            <DetailRow label="Verified" value={user.isVerified ? "Yes" : "No"} />
          ) : null}
          {user.gender ? <DetailRow label="Gender" value={formatValue(user.gender)} /> : null}
          {user.dateOfBirth ? (
            <DetailRow label="Date of Birth" value={formatValue(user.dateOfBirth)} />
          ) : null}
          <DetailRow label="Joined" value={formatValue(user.createdDateLabel)} />
        </Section>

        {user.businessName || user.address || user.country ? (
          <Section title="Business">
            {user.businessName ? (
              <DetailRow label="Business Name" value={formatValue(user.businessName)} />
            ) : null}
            {user.address ? <DetailRow label="Address" value={formatValue(user.address)} /> : null}
            {user.country ? <DetailRow label="Country" value={formatValue(user.country)} /> : null}
          </Section>
        ) : null}

        {user.extraFields.length > 0 ? (
          <Section title="Additional Details">
            {user.extraFields.map((field) => (
              <DetailRow key={field.label} label={field.label} value={field.value} />
            ))}
          </Section>
        ) : null}
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsRoleSheetVisible(false)}
        transparent
        visible={isRoleSheetVisible}
      >
        <Pressable onPress={() => setIsRoleSheetVisible(false)} style={styles.modalOverlay}>
          <Pressable style={styles.roleSheet}>
            <Text style={styles.roleSheetTitle}>Change Role</Text>
            {ROLE_OPTIONS.map((option, index) => {
              const isCurrent = option === user.role.toLowerCase();

              return (
                <TouchableOpacity
                  key={option}
                  activeOpacity={0.82}
                  onPress={() => handleSelectRole(option)}
                  style={[styles.roleOptionRow, index > 0 && styles.roleOptionRowBorder]}
                >
                  <Text style={[styles.roleOptionText, isCurrent && styles.roleOptionTextActive]}>
                    {formatRoleLabel(option)}
                  </Text>
                  {isCurrent ? (
                    <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  content: {
    paddingBottom: AppLayout.contentBottomPadding,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  stateWrap: {
    flex: 1,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  centeredContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  headerRow: {
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
  headerActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    padding: AppLayout.cardPadding + Spacing.sm,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 34,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  avatarImage: {
    backgroundColor: Colors.bg2,
    borderRadius: 34,
    height: 68,
    width: 68,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
  },
  userName: {
    color: Colors.heading,
    fontSize: 20,
    fontWeight: "800",
    marginTop: Spacing.md,
    textAlign: "center",
  },
  userEmail: {
    color: Colors.text2,
    fontSize: 13,
    marginTop: 4,
  },
  badgeRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  statusBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeActive: {
    backgroundColor: "#EAF5EF",
  },
  statusBadgeInactive: {
    backgroundColor: "#FEECEC",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  statusBadgeTextActive: {
    color: Colors.primaryDark,
  },
  statusBadgeTextInactive: {
    color: Colors.error,
  },
  verifiedBadge: {
    alignItems: "center",
    backgroundColor: Colors.successBg,
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  verifiedBadgeText: {
    color: Colors.success,
    fontSize: 11,
    fontWeight: "800",
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginTop: Spacing.md,
    padding: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: Spacing.md,
  },
  detailRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  detailLabel: {
    color: Colors.text2,
    fontSize: 13,
    flexShrink: 0,
    marginRight: Spacing.md,
  },
  detailValue: {
    color: Colors.heading,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginTop: AppLayout.sectionGap,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  stateTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "800",
  },
  stateSubtitle: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  stateButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    marginTop: Spacing.lg,
    minHeight: 46,
    paddingHorizontal: Spacing.xl,
  },
  stateButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  modalOverlay: {
    backgroundColor: "rgba(36, 59, 52, 0.24)",
    flex: 1,
    justifyContent: "flex-end",
    padding: Spacing.lg,
  },
  roleSheet: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  roleSheetTitle: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: Spacing.sm,
  },
  roleOptionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  roleOptionRowBorder: {
    borderTopColor: Colors.border,
    borderTopWidth: 1,
  },
  roleOptionText: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "600",
  },
  roleOptionTextActive: {
    color: Colors.primary,
  },
});
