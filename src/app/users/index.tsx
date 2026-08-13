import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { matchesTeamSearch, type StaffMember } from "@/data/teamData";
import { getStaffDetailsPath } from "@/features/staff/utils/staffNavigation";
import { deleteStaffThunk, fetchStaffThunk, setStaffActiveStatusThunk } from "@/middleware/staff/staff.thunk";
import {
  selectStaffActiveStatusTogglingIds,
  selectStaffDeletingIds,
  selectStaffError,
  selectStaffLoading,
  selectStaffLoadingMore,
  selectStaffMembers,
  selectStaffPagination,
  selectStaffQuery,
  selectStaffRefreshing,
} from "@/store/staff/staff.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import { selectCurrentUser } from "@/store/user/user.slice";
import { canManageStaffLifecycle } from "@/utils/userProfile";

function getRejectedMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

const isStaffActive = (staffMember: StaffMember) => staffMember.status !== "Inactive";

const matchesUserManagementQuery = (staffMember: StaffMember, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return matchesTeamSearch(staffMember, query) || staffMember.email.toLowerCase().includes(normalizedQuery);
};

function UserCard({
  canManageLifecycle,
  isDeleting,
  isTogglingStatus,
  onDelete,
  onToggleStatus,
  staffMember,
}: {
  canManageLifecycle: boolean;
  isDeleting: boolean;
  isTogglingStatus: boolean;
  onDelete: () => void;
  onToggleStatus: () => void;
  staffMember: StaffMember;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const isActive = isStaffActive(staffMember);

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={() => router.push(getStaffDetailsPath(staffMember.id))}
      style={styles.userCard}
    >
      <View style={[styles.avatar, { backgroundColor: staffMember.avatarBg }]}>
        <Text style={[styles.avatarText, { color: staffMember.avatarColor }]}>{staffMember.initials}</Text>
      </View>

      <View style={styles.userCopy}>
        <View style={styles.nameRow}>
          <Text style={styles.userName}>{staffMember.name}</Text>
          <View
            style={[styles.statusBadge, isActive ? styles.statusBadgeActive : styles.statusBadgeInactive]}
          >
            <Text
              style={[styles.statusBadgeText, isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive]}
            >
              {staffMember.status}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={12} color={Colors.text2} />
          <Text numberOfLines={1} style={styles.infoText}>
            {staffMember.email}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={12} color={Colors.text2} />
          <Text style={styles.infoText}>{staffMember.phone}</Text>
        </View>

        <View style={styles.roleBadge}>
          <Ionicons name="shield-checkmark-outline" size={12} color={Colors.primaryDark} />
          <Text style={styles.roleBadgeText}>{staffMember.role}</Text>
        </View>
      </View>

      {canManageLifecycle ? (
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={isTogglingStatus}
          hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
          onPress={onToggleStatus}
          style={styles.statusToggleButton}
        >
          {isTogglingStatus ? (
            <ActivityIndicator color={isActive ? Colors.warning : Colors.success} size="small" />
          ) : (
            <Ionicons
              name={isActive ? "pause-circle-outline" : "play-circle-outline"}
              size={20}
              color={isActive ? Colors.warning : Colors.success}
            />
          )}
        </TouchableOpacity>
      ) : null}

      {canManageLifecycle ? (
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={isDeleting}
          hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
          onPress={onDelete}
          style={styles.deleteButton}
        >
          {isDeleting ? (
            <ActivityIndicator color={Colors.error} size="small" />
          ) : (
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          )}
        </TouchableOpacity>
      ) : null}

      <Ionicons name="chevron-forward" size={18} color={Colors.text2} />
    </TouchableOpacity>
  );
}

function UserSkeletonCard() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.userCard}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.userCopy}>
        <View style={styles.skeletonName} />
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonLine} />
      </View>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIllustration}>
        <View style={styles.emptyIllustrationHalo} />
        <View style={styles.emptyIllustrationCard}>
          <Ionicons name="cloud-offline-outline" size={26} color={Colors.error} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>Unable to load users</Text>
      <Text style={styles.emptySubtitle}>{message}</Text>
      <TouchableOpacity activeOpacity={0.85} onPress={onRetry} style={styles.emptyButton}>
        <Text style={styles.emptyButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ queryActive }: { queryActive: boolean }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIllustration}>
        <View style={styles.emptyIllustrationHalo} />
        <View style={styles.emptyIllustrationCard}>
          <Ionicons name="people-outline" size={26} color={Colors.primary} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>No Users Found</Text>
      <Text style={styles.emptySubtitle}>
        {queryActive
          ? "Try a different search to find the right user."
          : "Users added to your organisation will show up here."}
      </Text>
    </View>
  );
}

export default function UsersScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const currentUser = useAppSelector(selectCurrentUser);
  const canManageLifecycle = canManageStaffLifecycle(currentUser?.role);

  const staffMembers = useAppSelector(selectStaffMembers);
  const staffError = useAppSelector(selectStaffError);
  const staffLoading = useAppSelector(selectStaffLoading);
  const staffLoadingMore = useAppSelector(selectStaffLoadingMore);
  const staffPagination = useAppSelector(selectStaffPagination);
  const staffQuery = useAppSelector(selectStaffQuery);
  const staffRefreshing = useAppSelector(selectStaffRefreshing);
  const deletingStaffIds = useAppSelector(selectStaffDeletingIds);
  const activeStatusTogglingStaffIds = useAppSelector(selectStaffActiveStatusTogglingIds);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    void dispatch(fetchStaffThunk({ limit: staffQuery.limit, page: 1, reset: true }));
  }, [dispatch, staffQuery.limit]);

  const filteredStaffMembers = useMemo(
    () => staffMembers.filter((staffMember) => matchesUserManagementQuery(staffMember, deferredQuery)),
    [deferredQuery, staffMembers],
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/more" as Href);
  };

  const handleRefresh = () => {
    void dispatch(fetchStaffThunk({ limit: staffQuery.limit, page: 1, refresh: true }));
  };

  const handleConfirmDelete = async (staffMember: StaffMember) => {
    const resultAction = await dispatch(deleteStaffThunk(staffMember.id));

    if (deleteStaffThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to delete user",
        getRejectedMessage(resultAction.payload, "Something went wrong. Please try again."),
      );
      return;
    }

    Alert.alert("User deleted", resultAction.payload.message ?? `${staffMember.name} has been removed.`);
  };

  const handleDeleteUser = (staffMember: StaffMember) => {
    Alert.alert(
      "Delete User",
      `Are you sure you want to delete "${staffMember.name}"? This action cannot be undone.`,
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: () => void handleConfirmDelete(staffMember),
          style: "destructive",
          text: "Delete",
        },
      ],
    );
  };

  const handleConfirmToggleStatus = async (staffMember: StaffMember) => {
    if (activeStatusTogglingStaffIds.includes(staffMember.id)) {
      return;
    }

    const nextStatus = isStaffActive(staffMember) ? "inactive" : "active";
    const resultAction = await dispatch(
      setStaffActiveStatusThunk({ nextStatus, staffId: staffMember.id }),
    );

    // setStaffActiveStatusThunk only fulfills once the activate/deactivate
    // call succeeds AND a refetch confirms the status actually changed —
    // no path here reports success without a confirmed backend change.
    if (setStaffActiveStatusThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to update user",
        getRejectedMessage(resultAction.payload, "Something went wrong. Please try again."),
      );
      return;
    }

    Alert.alert(
      nextStatus === "inactive" ? "User deactivated" : "User activated",
      `${staffMember.name} has been ${nextStatus === "inactive" ? "deactivated" : "activated"}.`,
    );
  };

  const handleToggleStatus = (staffMember: StaffMember) => {
    const activeNow = isStaffActive(staffMember);

    Alert.alert(
      activeNow ? "Deactivate User" : "Activate User",
      activeNow
        ? `Deactivate "${staffMember.name}"? They won't be assignable to new bookings until reactivated.`
        : `Activate "${staffMember.name}"? They will be marked available again.`,
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: () => void handleConfirmToggleStatus(staffMember),
          text: activeNow ? "Deactivate" : "Activate",
        },
      ],
    );
  };

  const handleLoadMore = () => {
    if (staffLoading || staffLoadingMore || staffRefreshing || !staffPagination.hasMore) {
      return;
    }

    void dispatch(
      fetchStaffThunk({
        limit: staffPagination.limit,
        page: staffPagination.nextPage,
      }),
    );
  };

  const isQueryActive = Boolean(query.trim());
  const showInitialLoading = staffLoading && staffMembers.length === 0;
  const showErrorState = Boolean(staffError) && staffMembers.length === 0 && !showInitialLoading;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />

      <FlatList
        ListEmptyComponent={
          showInitialLoading ? (
            <View>
              {Array.from({ length: 6 }).map((_, index) => (
                <UserSkeletonCard key={`user-skeleton-${index}`} />
              ))}
            </View>
          ) : showErrorState ? (
            <ErrorState message={staffError ?? "Please try again in a moment."} onRetry={handleRefresh} />
          ) : (
            <EmptyState queryActive={isQueryActive} />
          )
        }
        ListFooterComponent={
          <View style={styles.footerWrap}>
            {staffLoadingMore ? (
              <View style={styles.loadingMoreWrap}>
                <ActivityIndicator color={Colors.primary} size="small" />
                <Text style={styles.loadingMoreText}>Loading more users...</Text>
              </View>
            ) : null}
            <View style={{ height: 24 + insets.bottom }} />
          </View>
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <TouchableOpacity activeOpacity={0.8} onPress={handleBack} style={styles.backButton}>
                  <Ionicons name="chevron-back" size={18} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>User Management</Text>
                <View style={styles.backButtonPlaceholder} />
              </View>
              <View style={styles.summaryCard}>
                <View style={styles.summaryMetric}>
                  <Text style={styles.summaryLabel}>Total Users</Text>
                  <Text style={styles.summaryValue}>
                    {staffPagination.totalCount.toLocaleString("en-IN")}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryMetric}>
                  <Text style={styles.summaryLabel}>Loaded</Text>
                  <Text style={styles.summaryValue}>{staffMembers.length}</Text>
                </View>
              </View>
            </View>

            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={20} color={Colors.text2} />
              <TextInput
                onChangeText={setQuery}
                placeholder="Search by name, email, or role"
                placeholderTextColor={Colors.placeholder}
                style={styles.searchInput}
                value={query}
              />
              {query.trim().length > 0 ? (
                <TouchableOpacity activeOpacity={0.8} onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={18} color={Colors.placeholder} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.countRow}>
              <Text style={styles.countText}>
                {filteredStaffMembers.length} user{filteredStaffMembers.length === 1 ? "" : "s"}
              </Text>
            </View>
          </View>
        }
        contentContainerStyle={styles.listContent}
        data={filteredStaffMembers}
        initialNumToRender={8}
        keyExtractor={(item) => item.id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            colors={[Colors.primary]}
            onRefresh={handleRefresh}
            refreshing={staffRefreshing}
            tintColor={Colors.primary}
          />
        }
        renderItem={({ item }) => (
          <UserCard
            canManageLifecycle={canManageLifecycle}
            isDeleting={deletingStaffIds.includes(item.id)}
            isTogglingStatus={activeStatusTogglingStaffIds.includes(item.id)}
            onDelete={() => handleDeleteUser(item)}
            onToggleStatus={() => handleToggleStatus(item)}
            staffMember={item}
          />
        )}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        windowSize={8}
      />
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: Spacing.sm,
  },
  header: {
    marginBottom: AppLayout.sectionGap,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: AppLayout.sectionGap,
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
  backButtonPlaceholder: {
    width: AppLayout.headerActionSize,
  },
  headerTitle: {
    color: Colors.heading,
    fontSize: AppLayout.headerTitleFontSize,
    fontWeight: AppLayout.screenTitleFontWeight,
  },
  summaryCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: AppLayout.cardPadding,
    paddingVertical: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  summaryMetric: {
    flex: 1,
  },
  summaryLabel: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "600",
  },
  summaryValue: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6,
  },
  summaryDivider: {
    backgroundColor: Colors.border,
    height: 36,
    marginHorizontal: Spacing.md,
    width: 1,
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.search,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: AppLayout.sectionGap,
    minHeight: AppLayout.searchBarHeight,
    paddingHorizontal: AppLayout.searchBarPaddingX,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 14,
  },
  searchInput: {
    color: Colors.heading,
    flex: 1,
    fontSize: 14,
    minHeight: AppLayout.searchBarHeight,
  },
  countRow: {
    marginBottom: AppLayout.sectionGap,
  },
  countText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "600",
  },
  userCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: Spacing.sm,
    padding: AppLayout.cardPadding,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "800",
  },
  userCopy: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  statusToggleButton: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: Spacing.sm,
    width: 24,
  },
  deleteButton: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: Spacing.sm,
    width: 24,
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  userName: {
    color: Colors.heading,
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    marginRight: Spacing.sm,
  },
  statusBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeActive: {
    backgroundColor: Colors.successBg,
  },
  statusBadgeInactive: {
    backgroundColor: Colors.errorBg,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  statusBadgeTextActive: {
    color: Colors.primaryDark,
  },
  statusBadgeTextInactive: {
    color: Colors.error,
  },
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  infoText: {
    color: Colors.text2,
    flex: 1,
    fontSize: 12,
  },
  roleBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  roleBadgeText: {
    color: Colors.primaryDark,
    fontSize: 11,
    fontWeight: "700",
  },
  skeletonAvatar: {
    backgroundColor: Colors.bg2,
    borderRadius: 22,
    height: 44,
    width: 44,
  },
  skeletonName: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 16,
    width: "58%",
  },
  skeletonLine: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 12,
    marginTop: 8,
    width: "74%",
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginTop: AppLayout.sectionGap,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  emptyIllustration: {
    alignItems: "center",
    height: 96,
    justifyContent: "center",
    marginBottom: Spacing.md,
    width: 96,
  },
  emptyIllustrationHalo: {
    backgroundColor: Colors.bg2,
    borderRadius: 48,
    height: 96,
    opacity: 0.9,
    position: "absolute",
    width: 96,
  },
  emptyIllustrationCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    height: 54,
    justifyContent: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    transform: [{ rotate: "-7deg" }],
    width: 54,
  },
  emptyTitle: {
    color: Colors.heading,
    fontSize: 20,
    fontWeight: "800",
  },
  emptySubtitle: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  emptyButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    marginTop: Spacing.lg,
    minHeight: 46,
    paddingHorizontal: Spacing.xl,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  footerWrap: {
    paddingBottom: 0,
  },
  loadingMoreWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: Spacing.md,
  },
  loadingMoreText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "600",
  },
});
