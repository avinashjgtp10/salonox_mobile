import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLayout } from "@/constants/layout";
import AppointmentsList from "@/components/dashboard/AppointmentsList";
import DashboardHero from "@/components/dashboard/DashboardHero";
import { DashboardNotificationsModal } from "@/components/dashboard/DashboardNotificationsModal";
import { DashboardSideDrawer } from "@/components/dashboard/DashboardSideDrawer";
import DashboardStatTiles from "@/components/dashboard/DashboardStatTiles";
import QuickActions from "@/components/dashboard/QuickActions";
import StaffWorkload from "@/components/dashboard/StaffWorkload";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { useAuth } from "@/context/AuthContext";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { AttendanceToast } from "@/features/attendance/components/AttendanceToast";
import { useAppForeground } from "@/hooks/useAppForeground";
import {
  fetchAttendanceOverviewThunk,
  hydrateAttendanceFromCacheThunk,
} from "@/middleware/attendance/attendance.thunk";
import { fetchAppointmentsThunk } from "@/middleware/appointment/appointment.thunk";
import { fetchDashboardThunk } from "@/middleware/dashboard/dashboard.thunk";
import { fetchNotificationsThunk, fetchUnreadCountThunk } from "@/middleware/notification/notification.thunk";
import { fetchInventorySummaryThunk, fetchProductsThunk } from "@/middleware/product/product.thunk";
import { fetchStaffThunk } from "@/middleware/staff/staff.thunk";
import { fetchClientsThunk } from "@/middleware/client/client.thunk";
import { logStartupSince } from "@/services/startupPerformance";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { realtimeSocket } from "@/services/realtimeSocket";
import {
  selectDashboardError,
  selectDashboardIsLoading,
  selectDashboardIsStale,
  selectDashboardRefreshing,
  selectDashboardStatus,
} from "@/store/dashboard/dashboard.slice";
import { useThemeColors } from "@/theme/ThemeProvider";

const getTodayDateKey = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export default function DashboardScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();
  const didLogNavigationRef = useRef(false);
  const didRunStartupFetchRef = useRef(false);
  const didHandleInitialFocusRef = useRef(false);
  const [isQuickActionsDrawerOpen, setIsQuickActionsDrawerOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const dashboardError = useAppSelector(selectDashboardError);
  const isDashboardLoading = useAppSelector(selectDashboardIsLoading);
  const isDashboardRefreshing = useAppSelector(selectDashboardRefreshing);
  const isDashboardStale = useAppSelector(selectDashboardIsStale);
  const dashboardStatus = useAppSelector(selectDashboardStatus);
  const showErrorState = dashboardStatus === "failed";

  const fetchDashboard = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    await dispatch(fetchDashboardThunk());
  }, [dispatch, isAuthenticated]);

  const fetchAttendance = useCallback(() => {
    if (!isAuthenticated) {
      return;
    }

    void dispatch(fetchAttendanceOverviewThunk());
  }, [dispatch, isAuthenticated]);

  const fetchUnreadNotificationCount = useCallback(() => {
    if (!isAuthenticated) {
      return;
    }

    void dispatch(fetchUnreadCountThunk());
  }, [dispatch, isAuthenticated]);

  const fetchInventoryStock = useCallback(() => {
    if (!isAuthenticated) {
      return;
    }

    void dispatch(fetchInventorySummaryThunk());
  }, [dispatch, isAuthenticated]);

  const fetchUpcomingAppointments = useCallback(() => {
    if (!isAuthenticated) {
      return;
    }

    void dispatch(
      fetchAppointmentsThunk({
        date: getTodayDateKey(),
        limit: 100,
        page: 1,
        reset: true,
        search: "",
        sort_by: "scheduled_at",
        sort_order: "ASC",
        status: undefined,
      }),
    );
  }, [dispatch, isAuthenticated]);

  const fetchStartupData = useCallback(() => {
    if (!isAuthenticated) {
      return;
    }

    void Promise.allSettled([
      dispatch(fetchDashboardThunk()),
      dispatch(fetchAttendanceOverviewThunk()),
      dispatch(fetchInventorySummaryThunk()),
      dispatch(
        fetchAppointmentsThunk({
          date: getTodayDateKey(),
          limit: 100,
          page: 1,
          reset: true,
          search: "",
          sort_by: "scheduled_at",
          sort_order: "ASC",
          status: undefined,
        }),
      ),
      dispatch(fetchUnreadCountThunk()),
      dispatch(fetchNotificationsThunk({ refresh: true })),
      dispatch(fetchProductsThunk({ offset: 0, reset: true })),
      dispatch(fetchStaffThunk({ page: 1, reset: true })),
      dispatch(fetchClientsThunk({ offset: 0, reset: true, refresh: true })),
    ]);
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || didLogNavigationRef.current) {
      return;
    }

    didLogNavigationRef.current = true;
    logStartupSince("Navigation", "post_login_navigation");
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || didRunStartupFetchRef.current) {
      return;
    }

    didRunStartupFetchRef.current = true;
    void dispatch(hydrateAttendanceFromCacheThunk());
    fetchStartupData();
  }, [dispatch, fetchStartupData, isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        return;
      }

      if (!didHandleInitialFocusRef.current) {
        didHandleInitialFocusRef.current = true;
        return;
      }

      fetchUpcomingAppointments();
      // Picks up any check-in/out, manual mark, or edit made on the
      // Attendance screen (or the Web App) while this tab was unfocused, so
      // Staff Workload never shows a stale badge after returning here.
      fetchAttendance();
      fetchInventoryStock();
      // Same idea for the bell badge — picks up anything marked read/created
      // on the Notifications screen (or the Web App) since we last focused.
      fetchUnreadNotificationCount();

      if (dashboardStatus !== "idle" && isDashboardStale && !isDashboardLoading) {
        void fetchDashboard();
      }
    }, [
      dashboardStatus,
      fetchAttendance,
      fetchDashboard,
      fetchInventoryStock,
      fetchUnreadNotificationCount,
      fetchUpcomingAppointments,
      isAuthenticated,
      isDashboardLoading,
      isDashboardStale,
    ]),
  );

  // Attendance and the notification badge must reflect the web app's state
  // without requiring an app restart, so refresh both whenever the app comes
  // back to the foreground.
  useAppForeground(() => {
    if (!isAuthenticated) {
      return;
    }

    fetchAttendance();
    fetchInventoryStock();
    fetchUnreadNotificationCount();
  });

  // Real-time client updates: listen for new client creation from other devices/web app
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const socket = realtimeSocket.activeSocket;

    if (!socket?.connected) {
      return;
    }

    const handleClientCreated = () => {
      // Refetch clients to get updated total count
      dispatch(fetchClientsThunk({ offset: 0, reset: true, refresh: true }));
    };

    // Listen for client creation events from the backend
    // Common event names: "client:created", "client_created", "new_client"
    socket.on("client:created", handleClientCreated);
    socket.on("client_created", handleClientCreated);
    socket.on("new_client", handleClientCreated);

    return () => {
      socket.off("client:created", handleClientCreated);
      socket.off("client_created", handleClientCreated);
      socket.off("new_client", handleClientCreated);
    };
  }, [dispatch, isAuthenticated]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[Colors.primary]}
            onRefresh={() => {
              if (!isAuthenticated) {
                return;
              }

              void fetchDashboard();
              fetchUpcomingAppointments();
              fetchAttendance();
              fetchInventoryStock();
              fetchUnreadNotificationCount();
            }}
            refreshing={isDashboardRefreshing}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={showErrorState ? [] : [2]}
      >
        {showErrorState ? (
          <View style={styles.errorWrap}>
            <View style={styles.errorIcon}>
              <Ionicons name="cloud-offline-outline" size={26} color={Colors.error} />
            </View>
            <Text style={styles.errorTitle}>Unable to load dashboard</Text>
            <Text style={styles.errorSubtitle}>
              {dashboardError ?? "Please try again in a moment."}
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => void fetchDashboard()}
              style={styles.errorButton}
            >
              <Text style={styles.errorButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <DashboardHero onOpenNotifications={() => setIsNotificationsModalOpen(true)} onOpenQuickActions={() => setIsQuickActionsDrawerOpen(true)} />
            <View style={styles.summaryBlock}>
              <DashboardStatTiles />
            </View>
            <View style={[styles.sectionBlock, styles.stickyActions]}>
              <QuickActions />
            </View>
            <View style={styles.sectionBlock}>
              <AppointmentsList />
            </View>
            <View style={styles.sectionBlock}>
              <StaffWorkload />
            </View>
          </>
        )}
      </ScrollView>
      <DashboardSideDrawer
        onClose={() => setIsQuickActionsDrawerOpen(false)}
        visible={isQuickActionsDrawerOpen}
      />
      <DashboardNotificationsModal onClose={() => setIsNotificationsModalOpen(false)} visible={isNotificationsModalOpen} />
      <AttendanceToast />
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.dashboardSurface,
    flex: 1,
  },
  content: {
    backgroundColor: Colors.dashboardSurface,
    paddingBottom: AppLayout.contentBottomPadding,
  },
  sectionBlock: {
    marginTop: 16,
  },
  summaryBlock: {
    marginTop: 0,
  },
  stickyActions: {
    backgroundColor: Colors.dashboardSurface,
    zIndex: 10,
  },
  errorWrap: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  errorIcon: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.lg,
    height: 54,
    justifyContent: "center",
    marginBottom: Spacing.md,
    width: 54,
  },
  errorTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "800",
  },
  errorSubtitle: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  errorButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    marginTop: Spacing.lg,
    minHeight: 46,
    paddingHorizontal: Spacing.xl,
  },
  errorButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
