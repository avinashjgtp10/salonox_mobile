import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
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
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { NotificationItem } from "@/types/notification";

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

function NotificationSkeleton() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

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
}: {
  isMarking: boolean;
  notification: NotificationItem;
  onPress: () => void;
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
      </View>
      {isMarking ? <ActivityIndicator color={Colors.primary} size="small" /> : null}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  // Pure client-side derivation over the already-fetched list — no new
  // selector/thunk/API call. fetchNotificationsThunk, the 30s auto-refresh,
  // and useAppForeground all keep working on the same underlying data.
  const visibleNotifications = useMemo(
    () => (filter === "unread" ? notifications.filter((notification) => !notification.isRead) : notifications),
    [filter, notifications],
  );

  const refresh = useCallback(
    (args?: { refresh?: boolean }) => {
      void dispatch(fetchNotificationsThunk(args));
      void dispatch(fetchUnreadCountThunk());
    },
    [dispatch],
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

    router.replace("/dashboard");
  };

  const handlePressNotification = (notification: NotificationItem) => {
    if (!notification.isRead) {
      void dispatch(markNotificationReadThunk(notification.id));
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
        <TouchableOpacity activeOpacity={0.84} onPress={handleBack} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={18} color={Colors.primary} />
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
            { key: "all", label: "All" },
            { key: "unread", label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
          ]}
        />
      </View>

      {loading && notifications.length === 0 ? (
        <View style={styles.listContent}>
          {Array.from({ length: 5 }).map((_, index) => (
            <NotificationSkeleton key={`notification-skeleton-${index}`} />
          ))}
        </View>
      ) : error && notifications.length === 0 ? (
        <View style={styles.stateCard}>
          <View style={styles.stateIcon}>
            <Ionicons name="cloud-offline-outline" size={26} color={Colors.error} />
          </View>
          <Text style={styles.stateTitle}>Unable to load notifications</Text>
          <Text style={styles.stateDescription}>{error}</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={() => refresh()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={visibleNotifications}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.stateCard}>
              <View style={styles.stateIcon}>
                <Ionicons
                  name={filter === "unread" ? "checkmark-done-outline" : "notifications-off-outline"}
                  size={26}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.stateTitle}>
                {filter === "unread" ? "You're all caught up" : "No notifications yet"}
              </Text>
              <Text style={styles.stateDescription}>
                {filter === "unread"
                  ? "There are no unread notifications right now."
                  : "You'll see appointment, client, and sale updates here as they happen."}
              </Text>
            </View>
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
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    justifyContent: "space-between",
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: Spacing.sm,
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
    fontSize: AppLayout.headerTitleFontSize,
    fontWeight: AppLayout.screenTitleFontWeight,
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
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: Spacing.md,
  },
  listContent: {
    paddingBottom: AppLayout.contentBottomPadding,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
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
  stateCard: {
    alignItems: "center",
    marginTop: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  stateIcon: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 60,
    justifyContent: "center",
    marginBottom: Spacing.md,
    width: 60,
  },
  stateTitle: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
  },
  stateDescription: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    marginTop: Spacing.lg,
    minHeight: 46,
    paddingHorizontal: Spacing.xl,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
