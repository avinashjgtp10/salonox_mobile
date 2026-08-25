import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchNotificationsThunk, markNotificationReadThunk } from "@/middleware/notification/notification.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectNotifications,
  selectNotificationsListLoading,
  selectNotificationsListRefreshing,
} from "@/store/notification/notification.slice";
import type { NotificationItem } from "@/types/notification";
import { resolveNotificationRoute } from "@/utils/notificationRouting";

type DashboardNotificationsModalProps = {
  onClose: () => void;
  visible: boolean;
};

export function DashboardNotificationsModal({ onClose, visible }: DashboardNotificationsModalProps) {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const notifications = useAppSelector(selectNotifications);
  const loading = useAppSelector(selectNotificationsListLoading);
  const refreshing = useAppSelector(selectNotificationsListRefreshing);
  const modalInsets = useMemo(() => ({ paddingBottom: Math.max(insets.bottom, 12) }), [insets.bottom]);

  useEffect(() => {
    if (visible) {
      void dispatch(fetchNotificationsThunk({ refresh: notifications.length > 0 }));
    }
  }, [dispatch, notifications.length, visible]);

  const handleNotificationPress = (notification: NotificationItem) => {
    if (!notification.isRead) {
      void dispatch(markNotificationReadThunk(notification.id));
    }

    onClose();
    requestAnimationFrame(() => router.push(resolveNotificationRoute(notification)));
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.backdrop}>
        <Pressable style={[styles.panel, modalInsets]}>
          <View style={styles.header}>
            <Text style={styles.heading}>Notifications</Text>
            <TouchableOpacity accessibilityLabel="Close notifications" hitSlop={12} onPress={onClose} style={styles.closeButton}>
              <Ionicons color="#686868" name="close" size={27} />
            </TouchableOpacity>
          </View>

          {loading && notifications.length === 0 ? (
            <View style={styles.centerState}><ActivityIndicator color="#BE5793" size="large" /></View>
          ) : (
            <FlatList
              contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.list}
              data={notifications}
              keyExtractor={(item) => item.id}
              onRefresh={() => void dispatch(fetchNotificationsThunk({ refresh: true }))}
              refreshing={refreshing}
              renderItem={({ item }) => (
                <TouchableOpacity activeOpacity={0.8} onPress={() => handleNotificationPress(item)} style={styles.row}>
                  <View style={styles.alertIcon}>
                    <View style={styles.alertTriangle}><Ionicons color="#FFFFFF" name="alert" size={17} /></View>
                  </View>
                  <View style={styles.notificationCopy}>
                    <View style={styles.titleRow}>
                      <Text numberOfLines={1} style={styles.title}>{item.title || "SalonOX Alert"}</Text>
                      <Text style={styles.date}>{item.createdDateLabel}</Text>
                    </View>
                    {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<View style={styles.centerState}><Ionicons color="#BE5793" name="notifications-off-outline" size={32} /><Text style={styles.emptyText}>No notifications yet</Text></View>}
              showsVerticalScrollIndicator={false}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.58)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 58,
  },
  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 7,
    elevation: 24,
    maxHeight: "100%",
    overflow: "hidden",
    shadowColor: "#000000",
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
    color: "#17131B",
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
  list: {
    paddingHorizontal: 20,
  },
  row: {
    alignItems: "flex-start",
    borderBottomColor: "#D8D8D8",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    paddingVertical: 17,
  },
  alertIcon: {
    alignItems: "center",
    backgroundColor: "#E2E2E2",
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  alertTriangle: {
    alignItems: "center",
    backgroundColor: "#BE6A9F",
    borderRadius: 6,
    height: 30,
    justifyContent: "center",
    width: 30,
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
    color: "#111111",
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  date: {
    color: "#707070",
    fontSize: 12,
  },
  body: {
    color: "#171717",
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
    color: "#707070",
    fontSize: 14,
    fontWeight: "700",
  },
});
