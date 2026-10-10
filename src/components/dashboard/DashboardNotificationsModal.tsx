import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { Avatar } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchNotificationsThunk, markNotificationReadThunk, removeLocalNotificationThunk } from "@/middleware/notification/notification.thunk";
import { NotificationSwipeRow } from "@/components/ui/NotificationSwipeRow";
import { appAlert } from "@/services/appAlert";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectNotifications,
  selectNotificationsListLoading,
  selectNotificationsListRefreshing,
  selectMarkingReadIds,
  selectRemovingNotificationIds,
} from "@/store/notification/notification.slice";
import type { NotificationItem } from "@/types/notification";
import { resolveNotificationRoute } from "@/utils/notificationRouting";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ThemeColors } from "@/constants/theme";

type DashboardNotificationsModalProps = {
  onClose: () => void;
  visible: boolean;
};

export function DashboardNotificationsModal({ onClose, visible }: DashboardNotificationsModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const notifications = useAppSelector(selectNotifications);
  const loading = useAppSelector(selectNotificationsListLoading);
  const refreshing = useAppSelector(selectNotificationsListRefreshing);
  const markingReadIds = useAppSelector(selectMarkingReadIds);
  const removingIds = useAppSelector(selectRemovingNotificationIds);
  const [filter, setFilter] = useState<"unread" | "all">("unread");
  const modalInsets = useMemo(() => ({ paddingBottom: Math.max(insets.bottom, 12) }), [insets.bottom]);
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );
  const visibleNotifications = useMemo(
    () => filter === "unread"
      ? notifications.filter((notification) => !notification.isRead)
      : notifications,
    [filter, notifications],
  );

  useEffect(() => {
    if (visible) {
      setFilter("unread");
      void dispatch(fetchNotificationsThunk({ refresh: true }));
    }
  }, [dispatch, visible]);

  const handleNotificationPress = (notification: NotificationItem) => {
    if (!notification.isRead) {
      void dispatch(markNotificationReadThunk(notification.id));
    }

    onClose();
    router.push(resolveNotificationRoute(notification));
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.backdrop}>
        <Pressable style={[styles.panel, modalInsets]}>
          <View style={styles.header}>
            <Text style={styles.heading}>Notifications</Text>
            <TouchableOpacity accessibilityLabel="Close notifications" hitSlop={12} onPress={onClose} style={styles.closeButton}>
              <Ionicons color={colors.text2} name="close" size={27} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            <SegmentedTabs
              activeKey={filter}
              onChange={setFilter}
              segments={[
                { key: "unread", label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
                { key: "all", label: `All Notifications (${notifications.length})` },
              ]}
            />
          </View>

          {loading && notifications.length === 0 ? (
            <View style={styles.centerState}><ActivityIndicator color={colors.primary} size="large" /></View>
          ) : (
            <FlatList
              contentContainerStyle={visibleNotifications.length === 0 ? styles.emptyList : styles.list}
              data={visibleNotifications}
              keyExtractor={(item) => item.id}
              onRefresh={() => void dispatch(fetchNotificationsThunk({ refresh: true }))}
              refreshing={refreshing}
              renderItem={({ item }) => (
                <NotificationSwipeRow
                  disabled={markingReadIds.includes(item.id) || removingIds.includes(item.id)}
                  onDismiss={() => {
                    if (!item.isRead) void dispatch(markNotificationReadThunk(item.id)).unwrap().catch(() => {
                      appAlert.alert("Unable to dismiss", "Please try again.");
                    });
                  }}
                  onDelete={() => void dispatch(removeLocalNotificationThunk(item.id)).unwrap().catch(() => {
                    appAlert.alert("Unable to remove notification", "Please try again.");
                  })}
                >
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={markingReadIds.includes(item.id) || removingIds.includes(item.id)}
                  onPress={() => handleNotificationPress(item)}
                  style={styles.row}
                >
                  <Avatar.Icon color={colors.primary} icon="bell-outline" size={50} style={styles.alertIcon} />
                  <View style={styles.notificationCopy}>
                    <View style={styles.titleRow}>
                      <Text numberOfLines={1} style={styles.title}>{item.title || "SalonOX Alert"}</Text>
                      <Text style={styles.date}>{item.createdDateLabel}</Text>
                    </View>
                    {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
                  </View>
                </TouchableOpacity>
                </NotificationSwipeRow>
              )}
              ListEmptyComponent={
                <View style={styles.centerState}>
                  <Ionicons
                    color={colors.primary}
                    name={filter === "unread" ? "checkmark-done-outline" : "notifications-off-outline"}
                    size={32}
                  />
                  <Text style={styles.emptyText}>
                    {filter === "unread" ? "No unread notifications" : "No notifications yet"}
                  </Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.58)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 58,
  },
  panel: {
    backgroundColor: colors.card,
    borderRadius: 7,
    elevation: 24,
    maxHeight: "100%",
    overflow: "hidden",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    width: "100%",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 15,
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  heading: {
    color: colors.heading,
    fontFamily: "serif",
    fontSize: 25,
    fontWeight: "800",
  },
  closeButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  tabs: {
    paddingBottom: 6,
    paddingHorizontal: 20,
  },
  list: {
    paddingHorizontal: 20,
  },
  row: {
    alignItems: "flex-start",
    backgroundColor: colors.card,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    paddingVertical: 17,
  },
  alertIcon: {
    backgroundColor: colors.backgroundSelected,
  },
  notificationCopy: {
    flex: 1,
    minWidth: 0,
    paddingTop: 3,
  },
  titleRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  title: {
    color: colors.heading,
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  date: {
    color: colors.text2,
    fontSize: 12,
  },
  body: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 19,
    marginTop: 10,
  },
  centerState: {
    alignItems: "center",
    flex: 1,
    gap: 10,
    justifyContent: "center",
    minHeight: 260,
  },
  emptyList: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: colors.text2,
    fontSize: 14,
    fontWeight: "700",
  },
});
