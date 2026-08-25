import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { EmptyState, ErrorState } from "@/components/ui/StateViews";
import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { useAppForeground } from "@/hooks/useAppForeground";
import {
  fetchNotificationsThunk,
  fetchUnreadCountThunk,
  markAllNotificationsReadThunk,
  markNotificationReadThunk,
} from "@/middleware/notification/notification.thunk";
import {
  selectMarkingAllRead,
  selectMarkingReadIds,
  selectNotifications,
  selectNotificationsListError,
  selectNotificationsListLoading,
  selectNotificationsListRefreshing,
  selectUnreadCount,
} from "@/store/notification/notification.slice";
import {
  selectCurrentStaff,
  selectCurrentStaffError,
  selectCurrentStaffLoading,
} from "@/store/staff/staff.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { NotificationItem } from "@/types/notification";
import { resolveNotificationRoute } from "@/utils/notificationRouting";

// Presentation-only lookup keyed by the backend's free-form `type` string —
// unrecognized types still render fully via the fallback entry, never hidden
// or filtered, since the backend can add new notification types at any time.
const getNotificationIconMap = (
  Colors: ThemeColors,
): Record<string, { bg: string; color: string; icon: keyof typeof Ionicons.glyphMap }> => ({
  appointment: { bg: Colors.successBg, color: Colors.success, icon: "calendar-outline" },
  client: { bg: Colors.purpleBg, color: Colors.purple, icon: "person-add-outline" },
  payment: { bg: Colors.warningBg, color: Colors.warning, icon: "cash-outline" },
  whatsapp: { bg: Colors.successBg, color: Colors.success, icon: "logo-whatsapp" },
});

const getNotificationIconFallback = (Colors: ThemeColors) => ({
  bg: Colors.bg2,
  color: Colors.text2,
  icon: "notifications-outline" as const,
});

const getNotificationIcon = (type: string, Colors: ThemeColors) =>
  getNotificationIconMap(Colors)[type] ?? getNotificationIconFallback(Colors);

const AUTO_REFRESH_INTERVAL_MS = 30_000;

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

function NotificationSkeleton() {
  const Colors = useThemeColors();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(Colors, width), [Colors, width]);

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, styles.skeletonIcon]} />
      <View style={styles.copy}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
      </View>
    </View>
  );
}

function NotificationRow({
  isMarking,
  notification,
  onPress,
  showDetailMeta = false,
}: {
  isMarking: boolean;
  notification: NotificationItem;
  onPress: () => void;
  showDetailMeta?: boolean;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const iconConfig = getNotificationIcon(notification.type, Colors);

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={[styles.row, !notification.isRead && styles.rowUnread]}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconConfig.bg }]}>
        <Ionicons name={iconConfig.icon} size={17} color={iconConfig.color} />
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.title}>
            {notification.title}
          </Text>
          {!notification.isRead ? <View style={styles.unreadDot} /> : null}
        </View>
        {notification.body ? (
          <Text numberOfLines={2} style={styles.body}>
            {notification.body}
          </Text>
        ) : null}
        <Text style={styles.time}>{notification.createdDateLabel}</Text>
        {showDetailMeta ? (
          <View style={styles.metaRow}>
            <Text style={styles.metaPill}>{notification.type || "general"}</Text>
            <Text style={styles.metaPill}>{notification.isRead ? "Read" : "Unread"}</Text>
          </View>
        ) : null}
      </View>
      {isMarking ? <ActivityIndicator color={Colors.primary} size="small" /> : null}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen({
  backFallback = "/dashboard" as Href,
  enableDeepLinks = false,
  requireStaffIdentity = false,
  routeScope = "owner",
  showDetailMeta = false,
}: {
  backFallback?: Href;
  enableDeepLinks?: boolean;
  requireStaffIdentity?: boolean;
  routeScope?: "owner" | "staff";
  showDetailMeta?: boolean;
} = {}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectNotifications);
  const loading = useAppSelector(selectNotificationsListLoading);
  const refreshing = useAppSelector(selectNotificationsListRefreshing);
  const error = useAppSelector(selectNotificationsListError);
  const unreadCount = useAppSelector(selectUnreadCount);
  const markingReadIds = useAppSelector(selectMarkingReadIds);
  const markingAllRead = useAppSelector(selectMarkingAllRead);
  const currentStaff = useAppSelector(selectCurrentStaff);
  const currentStaffError = useAppSelector(selectCurrentStaffError);
  const currentStaffLoading = useAppSelector(selectCurrentStaffLoading);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("unread");
  const staffIdentityReady = !requireStaffIdentity || Boolean(currentStaff?.id);
  const blockingError =
    requireStaffIdentity && !currentStaff?.id && !currentStaffLoading
      ? currentStaffError ?? "Staff profile is not available for this session."
      : error;

  // Pure client-side derivation over the already-fetched list — no new
  // selector/thunk/API call. fetchNotificationsThunk, the 30s auto-refresh,
  // and useAppForeground all keep working on the same underlying data.
  const visibleNotifications = useMemo(
    () => (filter === "unread" ? notifications.filter((notification) => !notification.isRead) : notifications),
    [filter, notifications],
  );

  const refresh = useCallback(
    (args?: { refresh?: boolean }) => {
      if (!staffIdentityReady) {
        return;
      }

      void dispatch(fetchNotificationsThunk(args));
      void dispatch(fetchUnreadCountThunk());
    },
    [dispatch, staffIdentityReady],
  );

  useEffect(() => {
    refresh();
    // Only on mount — focus/foreground/interval triggers below cover the rest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();

      intervalRef.current = setInterval(() => refresh(), AUTO_REFRESH_INTERVAL_MS);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [refresh]),
  );

  useAppForeground(refresh);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(backFallback);
  };

  const handlePressNotification = (notification: NotificationItem) => {
    // Optimistic: the Redux slice immediately decrements unreadCount and marks
    // the item as read locally — the badge updates without waiting for the API.
    if (!notification.isRead) {
      void dispatch(markNotificationReadThunk(notification.id));
    }

    if (enableDeepLinks) {
      router.push(resolveNotificationRoute(notification, routeScope));
    }
  };

  const handleMarkAllRead = () => {
    if (unreadCount === 0 || markingAllRead) {
      return;
    }

    void dispatch(markAllNotificationsReadThunk());
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />

      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.84} hitSlop={12} onPress={handleBack} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          activeOpacity={0.84}
          disabled={unreadCount === 0 || markingAllRead}
          onPress={handleMarkAllRead}
          style={[styles.markAllButton, (unreadCount === 0 || markingAllRead) && styles.markAllButtonDisabled]}
        >
          {markingAllRead ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : (
            <Text style={styles.markAllButtonText}>Mark all read</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.segmentedWrap}>
        <SegmentedTabs
          activeKey={filter}
          onChange={setFilter}
          segments={[
            { key: "unread", label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
            { key: "all", label: "All" },
          ]}
        />
      </View>

      {(loading || (requireStaffIdentity && currentStaffLoading)) && notifications.length === 0 ? (
        <View style={styles.listContent}>
          {Array.from({ length: 5 }).map((_, index) => (
            <NotificationSkeleton key={`notification-skeleton-${index}`} />
          ))}
        </View>
      ) : blockingError && notifications.length === 0 ? (
        <ErrorState message={blockingError} onRetry={() => refresh()} />
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={visibleNotifications}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState
              accent={filter === "unread" ? "green" : "blue"}
              description={
                filter === "unread"
                  ? "There are no unread notifications right now."
                  : "You'll see appointment, client, and sale updates here as they happen."
              }
              icon={filter === "unread" ? "checkmark-done-outline" : "notifications-off-outline"}
              title={filter === "unread" ? "You're all caught up" : "No notifications yet"}
            />
          }
          refreshControl={
            <RefreshControl
              colors={[Colors.primary]}
              onRefresh={() => refresh({ refresh: true })}
              refreshing={refreshing}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => (
            <NotificationRow
              isMarking={markingReadIds.includes(item.id)}
              notification={item}
              onPress={() => handlePressNotification(item)}
              showDetailMeta={showDetailMeta}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors, width = 393) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
    paddingHorizontal: getResponsiveHorizontalPadding(width),
    paddingTop: width < 360 ? Spacing.sm : Spacing.md,
  },
  iconButton: {
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
    flex: 1,
    fontSize: getResponsiveTitleSize(width),
    fontWeight: AppLayout.screenTitleFontWeight,
    textAlign: "center",
  },
  markAllButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: AppLayout.headerActionSize,
    paddingHorizontal: 4,
  },
  markAllButtonDisabled: {
    opacity: 0.4,
  },
  markAllButtonText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  segmentedWrap: {
    paddingHorizontal: getResponsiveHorizontalPadding(width),
    paddingTop: Spacing.md,
  },
  listContent: {
    paddingBottom: AppLayout.contentBottomPadding,
    paddingHorizontal: getResponsiveHorizontalPadding(width),
    paddingTop: Spacing.md,
  },
  row: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  rowUnread: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: Radius.md,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  skeletonIcon: {
    backgroundColor: Colors.bg2,
  },
  copy: {
    flex: 1,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  title: {
    color: Colors.heading,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  unreadDot: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    height: 7,
    width: 7,
  },
  body: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  time: {
    color: Colors.text2,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  metaPill: {
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    color: Colors.text2,
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: "capitalize",
  },
  skeletonLine: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 12,
    marginBottom: 6,
    width: "80%",
  },
  skeletonLineShort: {
    width: "45%",
  },
});
