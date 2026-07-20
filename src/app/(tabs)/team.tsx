import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { StaffCard } from "@/components/team/StaffCard";
import { SummaryCard } from "@/components/team/SummaryCard";
import { AppLayout, AppRadius } from "@/constants/layout";
import { BottomTabInset, DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";
import {
  getTeamSummary,
  matchesTeamFilter,
  matchesTeamSearch,
  sortTeamMembers,
  TEAM_FILTERS,
  TEAM_SORT_OPTIONS,
  type StaffMember,
  type TeamFilter,
  type TeamSortOption,
} from "@/data/teamData";
import { deleteStaffThunk, fetchStaffThunk, updateStaffThunk } from "@/middleware/staff/staff.thunk";
import {
  selectStaffById,
  selectStaffError,
  selectStaffLoading,
  selectStaffLoadingMore,
  selectStaffMembers,
  selectStaffPagination,
  selectStaffQuery,
  selectStaffRefreshing,
} from "@/store/staff/staff.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
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

const MENU_OPTIONS = [
  "Edit Staff",
  "View Schedule",
  "Assign Services",
  "Manage Leave",
  "Performance",
  "Deactivate",
  "Delete",
] as const;

function SummarySkeletonCard({ index }: { index: number }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <Animated.View
      entering={FadeInDown.duration(220).delay(Math.min(index * 35, 140))}
      style={styles.summarySkeleton}
    >
      <View style={styles.summarySkeletonIcon} />
      <View style={styles.summarySkeletonTitle} />
      <View style={styles.summarySkeletonValue} />
      <View style={styles.summarySkeletonSubtitle} />
    </Animated.View>
  );
}

function StaffSkeletonCard({ index }: { index: number }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <Animated.View
      entering={FadeInDown.duration(220).delay(Math.min(index * 40, 180))}
      style={styles.staffSkeleton}
    >
      <View style={styles.staffSkeletonTop}>
        <View style={styles.staffSkeletonAvatar} />
        <View style={styles.staffSkeletonCopy}>
          <View style={styles.staffSkeletonName} />
          <View style={styles.staffSkeletonRole} />
          <View style={styles.staffSkeletonStatus} />
        </View>
        <View style={styles.staffSkeletonActionGroup}>
          <View style={styles.staffSkeletonAction} />
          <View style={styles.staffSkeletonAction} />
          <View style={styles.staffSkeletonAction} />
          <View style={styles.staffSkeletonAction} />
        </View>
      </View>

      <View style={styles.staffSkeletonPerformanceRow}>
        <View style={styles.staffSkeletonPerformance} />
        <View style={styles.staffSkeletonPerformance} />
        <View style={styles.staffSkeletonPerformance} />
        <View style={styles.staffSkeletonPerformance} />
      </View>
    </Animated.View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIllustration}>
        <Ionicons name="cloud-offline-outline" size={30} color={Colors.primary} />
      </View>
      <Text style={styles.stateTitle}>Unable to load staff</Text>
      <Text style={styles.stateDescription}>
        Please try again. We could not refresh your team view right now.
      </Text>
      <TouchableOpacity activeOpacity={0.85} onPress={onRetry} style={styles.stateButton}>
        <Text style={styles.stateButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({
  description,
  onAdd,
  title,
}: {
  description: string;
  onAdd: () => void;
  title: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIllustration}>
        <Ionicons name="people-outline" size={30} color={Colors.primary} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateDescription}>{description}</Text>
      <TouchableOpacity activeOpacity={0.85} onPress={onAdd} style={styles.stateButton}>
        <Text style={styles.stateButtonText}>Add Staff</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TeamScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const searchInputRef = useRef<TextInput | null>(null);
  const currentUser = useAppSelector(selectCurrentUser);
  const canManageLifecycle = canManageStaffLifecycle(currentUser?.role);
  const staffMembers = useAppSelector(selectStaffMembers);
  const staffError = useAppSelector(selectStaffError);
  const staffLoading = useAppSelector(selectStaffLoading);
  const staffLoadingMore = useAppSelector(selectStaffLoadingMore);
  const staffPagination = useAppSelector(selectStaffPagination);
  const staffQuery = useAppSelector(selectStaffQuery);
  const staffRefreshing = useAppSelector(selectStaffRefreshing);
  const [activeFilter, setActiveFilter] = useState<TeamFilter>("All");
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedMenuStaffId, setSelectedMenuStaffId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<TeamSortOption>("Highest Revenue");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    void dispatch(
      fetchStaffThunk({
        limit: staffQuery.limit,
        page: 1,
        reset: true,
      }),
    );
  }, [dispatch, staffQuery.limit]);

  const filteredStaffMembers = useMemo(() => {
    const visibleStaffMembers = staffMembers.filter(
      (staffMember) =>
        matchesTeamFilter(staffMember, activeFilter) &&
        matchesTeamSearch(staffMember, deferredQuery),
    );

    return sortTeamMembers(visibleStaffMembers, sortOption);
  }, [activeFilter, deferredQuery, sortOption, staffMembers]);

  const summaryItems = useMemo(() => getTeamSummary(staffMembers), [staffMembers]);
  const selectedMenuStaffMember = useAppSelector((state) =>
    selectStaffById(state, selectedMenuStaffId),
  );

  const handleAddStaff = () => router.push("/team/new");
  const handleRefresh = () => {
    void dispatch(
      fetchStaffThunk({
        limit: staffQuery.limit,
        page: 1,
        refresh: true,
      }),
    );
  };

  const handleRetry = () => {
    void dispatch(
      fetchStaffThunk({
        limit: staffQuery.limit,
        page: 1,
        reset: true,
      }),
    );
  };

  const handleLoadMore = () => {
    if (
      staffLoading ||
      staffLoadingMore ||
      staffRefreshing ||
      !staffPagination.hasMore
    ) {
      return;
    }

    void dispatch(
      fetchStaffThunk({
        limit: staffPagination.limit,
        page: staffPagination.nextPage,
      }),
    );
  };

  const handleCall = async (staffMember: StaffMember) => {
    const phoneUrl = `tel:${staffMember.phone}`;

    try {
      const canOpen = await Linking.canOpenURL(phoneUrl);

      if (canOpen) {
        await Linking.openURL(phoneUrl);
      }
    } catch {
      return;
    }
  };

  const handleMessage = async (staffMember: StaffMember) => {
    const messageUrl = `sms:${staffMember.phone}`;

    try {
      const canOpen = await Linking.canOpenURL(messageUrl);

      if (canOpen) {
        await Linking.openURL(messageUrl);
      }
    } catch {
      return;
    }
  };

  const handleConfirmDeleteStaff = async (staffMember: StaffMember) => {
    const resultAction = await dispatch(deleteStaffThunk(staffMember.id));

    if (deleteStaffThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to delete staff",
        getRejectedMessage(resultAction.payload, "Something went wrong. Please try again."),
      );
      return;
    }

    Alert.alert("Staff deleted", resultAction.payload.message ?? `${staffMember.name} has been removed.`);
  };

  const handleConfirmToggleActive = async (
    staffMember: StaffMember,
    nextStatus: "active" | "inactive",
  ) => {
    const resultAction = await dispatch(
      updateStaffThunk({ staffId: staffMember.id, updates: { status: nextStatus } }),
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

  const handleMenuOptionPress = (option: (typeof MENU_OPTIONS)[number]) => {
    const staffMember = selectedMenuStaffMember;

    setSelectedMenuStaffId(null);

    if (!staffMember) {
      return;
    }

    if (option === "Performance") {
      router.push(`/team/${staffMember.id}`);
      return;
    }

    if (option === "Edit Staff") {
      router.push(`/team/${staffMember.id}/edit` as Href);
      return;
    }

    if (option === "View Schedule") {
      router.push(`/team/${staffMember.id}/schedule` as Href);
      return;
    }

    if (option === "Manage Leave") {
      router.push(`/team/${staffMember.id}/leaves` as Href);
      return;
    }

    if (option === "Assign Services") {
      Alert.alert("Coming soon", "Assigning services to staff isn't available yet.");
      return;
    }

    if (option === "Deactivate") {
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
            onPress: () => void handleConfirmToggleActive(staffMember, nextStatus),
            text: isCurrentlyInactive ? "Reactivate" : "Deactivate",
          },
        ],
      );
      return;
    }

    if (option === "Delete") {
      if (!canManageLifecycle) {
        Alert.alert("Permission required", "You don't have permission to delete staff members.");
        return;
      }

      Alert.alert(
        "Delete Staff",
        `Are you sure you want to delete ${staffMember.name}? This action cannot be undone.`,
        [
          { style: "cancel", text: "Cancel" },
          {
            onPress: () => void handleConfirmDeleteStaff(staffMember),
            style: "destructive",
            text: "Delete",
          },
        ],
      );
    }
  };

  const renderItem: ListRenderItem<StaffMember> = ({ index, item }) => (
    <StaffCard
      index={index}
      onCall={handleCall}
      onMessage={handleMessage}
      onMore={(staffMember) => setSelectedMenuStaffId(staffMember.id)}
      staffMember={item}
    />
  );

  const headerContent = (
    <View>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Team</Text>
          <Text style={styles.subtitle}>Manage your salon staff</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => router.push("/team/commissions" as Href)}
            style={styles.headerIconButton}
          >
            <Ionicons name="cash-outline" size={18} color={Colors.primaryDark} />
          </TouchableOpacity>
        </View>
      </View>

      {staffLoading ? (
        <ScrollView
          contentContainerStyle={styles.summaryRow}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <SummarySkeletonCard key={`summary-skeleton-${index}`} index={index} />
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.summaryRow}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {summaryItems.map((item, index) => (
            <SummaryCard key={item.id} index={index} item={item} />
          ))}
        </ScrollView>
      )}

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.text2} />
        <TextInput
          ref={searchInputRef}
          onChangeText={setQuery}
          placeholder="Search staff by name, phone or role"
          placeholderTextColor={Colors.placeholder}
          style={styles.searchInput}
          value={query}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.chipRow}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {TEAM_FILTERS.map((filter) => {
          const isActive = filter === activeFilter;

          return (
            <TouchableOpacity
              key={filter}
              activeOpacity={0.84}
              onPress={() =>
                startTransition(() => {
                  setActiveFilter(filter);
                })
              }
              style={[styles.filterChip, isActive && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {filteredStaffMembers.length} {filteredStaffMembers.length === 1 ? "member" : "members"}
        </Text>
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => setIsFilterVisible(true)}
          style={styles.sortButton}
        >
          <Ionicons name="funnel-outline" size={15} color={Colors.primaryDark} />
          <Text style={styles.sortButtonText}>{sortOption}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardWrap}
      >
        {staffError && !staffLoading ? (
          <View style={styles.content}>
            {headerContent}
            <ErrorState onRetry={handleRetry} />
          </View>
        ) : staffLoading ? (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {headerContent}
            {Array.from({ length: 3 }).map((_, index) => (
              <StaffSkeletonCard key={`staff-skeleton-${index}`} index={index} />
            ))}
          </ScrollView>
        ) : (
          <FlatList
            contentContainerStyle={styles.listContent}
            data={filteredStaffMembers}
            keyExtractor={(item) => item.id}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              staffMembers.length === 0 ? (
                <EmptyState
                  description="Add your first staff member to start assigning appointments."
                  onAdd={handleAddStaff}
                  title="No staff added yet"
                />
              ) : (
                <EmptyState
                  description="Try another search or filter to find the right staff member."
                  onAdd={handleAddStaff}
                  title="No matching staff found"
                />
              )
            }
            ListHeaderComponent={headerContent}
            ListFooterComponent={
              staffLoadingMore ? <StaffSkeletonCard index={0} /> : null
            }
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
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
          />
        )}

        <TouchableOpacity activeOpacity={0.88} onPress={handleAddStaff} style={styles.floatingButton}>
          <Ionicons name="add" size={20} color={Colors.onPrimary} />
          <Text style={styles.floatingButtonText}>Add Staff</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsFilterVisible(false)}
        transparent
        visible={isFilterVisible}
      >
        <Pressable onPress={() => setIsFilterVisible(false)} style={styles.modalOverlay}>
          <Pressable style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>Sort Team</Text>
            {TEAM_SORT_OPTIONS.map((option) => {
              const isActive = option === sortOption;

              return (
                <TouchableOpacity
                  key={option}
                  activeOpacity={0.84}
                  onPress={() => {
                    setSortOption(option);
                    setIsFilterVisible(false);
                  }}
                  style={[styles.sheetAction, isActive && styles.sheetActionActive]}
                >
                  <Text style={[styles.sheetActionText, isActive && styles.sheetActionTextActive]}>
                    {option}
                  </Text>
                  {isActive ? (
                    <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedMenuStaffId(null)}
        transparent
        visible={Boolean(selectedMenuStaffMember)}
      >
        <Pressable onPress={() => setSelectedMenuStaffId(null)} style={styles.modalOverlay}>
          <Pressable style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>{selectedMenuStaffMember?.name ?? "Staff Actions"}</Text>
            {MENU_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                activeOpacity={0.84}
                onPress={() => handleMenuOptionPress(option)}
                style={styles.sheetAction}
              >
                <Text
                  style={[
                    styles.sheetActionText,
                    (option === "Delete" || option === "Deactivate") && styles.sheetActionDanger,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  keyboardWrap: {
    flex: 1,
  },
  content: {
    paddingBottom: BottomTabInset + 92,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  listContent: {
    paddingBottom: BottomTabInset + 92,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: AppLayout.headerMarginBottom,
  },
  headerCopy: {
    flex: 1,
    marginRight: Spacing.md,
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
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  headerIconButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    height: AppLayout.headerActionSize,
    justifyContent: "center",
    width: AppLayout.headerActionSize,
  },
  summaryRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: AppLayout.headerMarginBottom,
    paddingRight: 2,
  },
  summarySkeleton: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    minHeight: AppLayout.summaryCardMinHeight,
    padding: AppLayout.cardPadding,
    width: AppLayout.summaryCardWidth,
  },
  summarySkeletonIcon: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    height: 36,
    width: 36,
  },
  summarySkeletonTitle: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 12,
    marginTop: Spacing.md,
    width: "58%",
  },
  summarySkeletonValue: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 24,
    marginTop: 10,
    width: "42%",
  },
  summarySkeletonSubtitle: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 11,
    marginTop: 10,
    width: "76%",
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.search,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: AppLayout.sectionGap,
    minHeight: AppLayout.searchBarHeight,
    paddingHorizontal: AppLayout.searchBarPaddingX,
  },
  searchInput: {
    color: Colors.heading,
    flex: 1,
    fontSize: 14,
    minHeight: AppLayout.searchBarHeight,
    paddingLeft: 10,
  },
  chipRow: {
    gap: 8,
    paddingBottom: 4,
  },
  filterChip: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primary,
  },
  filterChipText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: Colors.onPrimary,
  },
  resultsRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: AppLayout.sectionGap,
    marginTop: AppLayout.sectionGap,
  },
  resultsText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
  },
  sortButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sortButtonText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 8,
  },
  staffSkeleton: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginBottom: AppLayout.sectionGap,
    padding: AppLayout.cardPadding,
  },
  staffSkeletonTop: {
    flexDirection: "row",
  },
  staffSkeletonAvatar: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 58,
    width: 58,
  },
  staffSkeletonCopy: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  staffSkeletonName: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 16,
    width: "64%",
  },
  staffSkeletonRole: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 12,
    marginTop: 10,
    width: "42%",
  },
  staffSkeletonStatus: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 12,
    marginTop: 10,
    width: "58%",
  },
  staffSkeletonActionGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
    marginLeft: Spacing.md,
    width: 104,
  },
  staffSkeletonAction: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    height: 36,
    width: 36,
  },
  staffSkeletonPerformanceRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: Spacing.md,
  },
  staffSkeletonPerformance: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    flex: 1,
    height: 54,
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginTop: AppLayout.sectionGap,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  stateIllustration: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 74,
    justifyContent: "center",
    width: 74,
  },
  stateTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "800",
    marginTop: Spacing.md,
  },
  stateDescription: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  stateButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.full,
    marginTop: Spacing.lg,
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  stateButtonText: {
    color: Colors.onPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
  floatingButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.full,
    bottom: 20,
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    position: "absolute",
    right: AppLayout.floatingButtonRight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 7,
  },
  floatingButtonText: {
    color: Colors.onPrimary,
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 8,
  },
  modalOverlay: {
    backgroundColor: "rgba(28, 25, 23, 0.12)",
    flex: 1,
    justifyContent: "flex-end",
    padding: Spacing.lg,
  },
  sheetCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sheetTitle: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: Spacing.sm,
  },
  sheetAction: {
    alignItems: "center",
    borderRadius: Radius.md,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 14,
  },
  sheetActionActive: {
    backgroundColor: Colors.bg2,
  },
  sheetActionText: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "600",
  },
  sheetActionTextActive: {
    color: Colors.primaryDark,
    fontWeight: "800",
  },
  sheetActionDanger: {
    color: Colors.error,
  },
});
