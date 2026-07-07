import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import { deleteUserThunk, fetchUsersThunk } from "@/middleware/users/users.thunk";
import { usersService } from "@/services/users.service";
import {
  selectUserDeletingIds,
  selectUsers,
  selectUsersError,
  selectUsersLoading,
  selectUsersLoadingMore,
  selectUsersPagination,
  selectUsersQuery,
  selectUsersRefreshing,
  selectUsersTotalCount,
} from "@/store/users/users.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { UserListItem } from "@/types/user";

function getRejectedMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function UserCard({
  isDeleting,
  onDelete,
  user,
}: {
  isDeleting: boolean;
  onDelete: () => void;
  user: UserListItem;
}) {
  const avatarTone = usersService.getAvatarTone(user.id);
  const statusIsInactive = !user.isActive;

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={() => router.push(`/users/${user.id}` as Href)}
      style={styles.userCard}
    >
      {user.avatarUrl ? (
        <Image contentFit="cover" source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: avatarTone.background }]}>
          <Text style={[styles.avatarText, { color: avatarTone.color }]}>{user.initials}</Text>
        </View>
      )}

      <View style={styles.userCopy}>
        <View style={styles.nameRow}>
          <Text style={styles.userName}>{user.fullName}</Text>
          <View
            style={[
              styles.statusBadge,
              statusIsInactive ? styles.statusBadgeInactive : styles.statusBadgeActive,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                statusIsInactive ? styles.statusBadgeTextInactive : styles.statusBadgeTextActive,
              ]}
            >
              {user.status}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={12} color={Colors.text2} />
          <Text numberOfLines={1} style={styles.infoText}>
            {user.email}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={12} color={Colors.text2} />
          <Text style={styles.infoText}>{user.phone}</Text>
        </View>

        {user.role !== "-" ? (
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark-outline" size={12} color={Colors.primaryDark} />
            <Text style={styles.roleBadgeText}>{user.role}</Text>
          </View>
        ) : null}
      </View>

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

      <Ionicons name="chevron-forward" size={18} color={Colors.text2} />
    </TouchableOpacity>
  );
}

function UserSkeletonCard() {
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
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const users = useAppSelector(selectUsers);
  const usersError = useAppSelector(selectUsersError);
  const usersLoading = useAppSelector(selectUsersLoading);
  const usersLoadingMore = useAppSelector(selectUsersLoadingMore);
  const usersPagination = useAppSelector(selectUsersPagination);
  const usersQuery = useAppSelector(selectUsersQuery);
  const usersRefreshing = useAppSelector(selectUsersRefreshing);
  const totalCount = useAppSelector(selectUsersTotalCount);
  const deletingUserIds = useAppSelector(selectUserDeletingIds);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    void dispatch(fetchUsersThunk({ limit: 20, offset: 0, reset: true, search: debouncedQuery }));
  }, [debouncedQuery, dispatch]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/more" as Href);
  };

  const handleRefresh = () => {
    void dispatch(
      fetchUsersThunk({ limit: usersQuery.limit, refresh: true, search: debouncedQuery }),
    );
  };

  const handleConfirmDelete = async (user: UserListItem) => {
    const resultAction = await dispatch(deleteUserThunk(user.id));

    if (deleteUserThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to delete user",
        getRejectedMessage(resultAction.payload, "Something went wrong. Please try again."),
      );
      return;
    }

    Alert.alert("User deleted", resultAction.payload.message ?? "User deleted successfully.");

    // Refresh the User List from the server after a successful deletion.
    void dispatch(
      fetchUsersThunk({
        limit: usersQuery.limit,
        offset: 0,
        reset: true,
        search: debouncedQuery,
      }),
    );
  };

  const handleDeleteUser = (user: UserListItem) => {
    Alert.alert(
      "Delete User",
      `Are you sure you want to delete "${user.fullName}"? This action cannot be undone.`,
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: () => void handleConfirmDelete(user),
          style: "destructive",
          text: "Delete",
        },
      ],
    );
  };

  const handleLoadMore = () => {
    if (usersLoading || usersLoadingMore || usersRefreshing || !usersPagination.hasMore) {
      return;
    }

    void dispatch(
      fetchUsersThunk({
        limit: usersPagination.limit,
        offset: usersPagination.nextOffset,
        search: debouncedQuery,
      }),
    );
  };

  const isQueryActive = Boolean(query.trim());
  const showInitialLoading = usersLoading && users.length === 0;
  const showErrorState = Boolean(usersError) && users.length === 0 && !showInitialLoading;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />

      <FlatList
        ListEmptyComponent={
          showInitialLoading ? (
            <View>
              {Array.from({ length: 6 }).map((_, index) => (
                <UserSkeletonCard key={`user-skeleton-${index}`} />
              ))}
            </View>
          ) : showErrorState ? (
            <ErrorState message={usersError ?? "Please try again in a moment."} onRetry={handleRefresh} />
          ) : (
            <EmptyState queryActive={isQueryActive} />
          )
        }
        ListFooterComponent={
          <View style={styles.footerWrap}>
            {usersLoadingMore ? (
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
                  <Text style={styles.summaryValue}>{totalCount.toLocaleString("en-IN")}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryMetric}>
                  <Text style={styles.summaryLabel}>Loaded</Text>
                  <Text style={styles.summaryValue}>{users.length}</Text>
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
                {users.length} user{users.length === 1 ? "" : "s"}
              </Text>
            </View>
          </View>
        }
        contentContainerStyle={styles.listContent}
        data={users}
        initialNumToRender={8}
        keyExtractor={(item) => item.id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            colors={[Colors.primary]}
            onRefresh={handleRefresh}
            refreshing={usersRefreshing}
            tintColor={Colors.primary}
          />
        }
        renderItem={({ item }) => (
          <UserCard
            isDeleting={deletingUserIds.includes(item.id)}
            onDelete={() => handleDeleteUser(item)}
            user={item}
          />
        )}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        windowSize={8}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    shadowColor: Colors.primaryDark,
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
    shadowColor: Colors.primaryDark,
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
    shadowColor: Colors.primaryDark,
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
  avatarImage: {
    backgroundColor: Colors.bg2,
    borderRadius: 22,
    height: 44,
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
    backgroundColor: "#EAF5EF",
  },
  statusBadgeInactive: {
    backgroundColor: "#FEECEC",
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
    backgroundColor: "#EEF4F1",
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
    shadowColor: Colors.primaryDark,
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
