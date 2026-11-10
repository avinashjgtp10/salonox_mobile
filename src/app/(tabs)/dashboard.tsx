import { StaffAttendanceCard } from "@/features/attendance/components/StaffAttendanceExperience";
import { DashboardUpgradeRequired } from "@/components/dashboard/DashboardUpgradeRequired";
import { isStaffAccount, isManagerAccount, canAccessBusinessModule } from "@/utils/staffExperience";
import { useRegionalPreferences } from "@/localization/preferences";
/**
 * Owner dashboard (prototype pearl design). Data loading is unchanged from the previous
 * screen: same thunks, refresh triggers, socket listeners and day roll-over.
 */
import { LinearGradient } from "expo-linear-gradient";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { pearl, pearlShadow, pearlType } from "@/components/auth/pearl/tokens";
import { NextAppointments, StaffOnFloor } from "@/components/dashboard/DashboardLists";
import { MenuDrawer, NotificationsSheet, SalonSwitchSheet } from "@/components/dashboard/DashboardSheets";
import SpotlightAnnouncementCard from "@/components/dashboard/SpotlightAnnouncementCard";
import { LunoxInsightCard } from "@/components/lunox/LunoxInsightCard";
import { HeroSurface } from "@/components/pearl/HeroSurface";
import { Icon, type IconName } from "@/components/pearl/Icon";
import { LoadError, Page } from "@/components/pearl/Page";
import { IconButton, Skeleton, StatTile } from "@/components/pearl/ui";
import { Text } from "@/components/ui/AppTypography";
import { useAuth } from "@/context/AuthContext";
import { AttendanceToast } from "@/features/attendance/components/AttendanceToast";
import { useSalonDay } from "@/hooks/useSalonDay";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { fetchAppointmentsThunk } from "@/middleware/appointment/appointment.thunk";
import { fetchAttendanceOverviewThunk, hydrateAttendanceFromCacheThunk } from "@/middleware/attendance/attendance.thunk";
import { fetchClientsThunk } from "@/middleware/client/client.thunk";
import { fetchDashboardThunk } from "@/middleware/dashboard/dashboard.thunk";
import { fetchNotificationsThunk, fetchUnreadCountThunk } from "@/middleware/notification/notification.thunk";
import { fetchInventorySummaryThunk, fetchProductsThunk } from "@/middleware/product/product.thunk";
import { fetchStaffThunk } from "@/middleware/staff/staff.thunk";
import { monthlyProjectionService } from "@/services/monthlyProjection.service";
import { realtimeSocket } from "@/services/realtimeSocket";
import { selectActiveBranch, selectActiveBranchId, selectShouldShowBranchSelector } from "@/store/branch/branch.slice";
import { selectClientsTotalCount } from "@/store/client/client.slice";
import {
  selectDashboardIsLoading,
  selectDashboardModuleLocked,
  selectDashboardLastFetchedAt,
  selectDashboardMetrics,
  selectDashboardStatus,
} from "@/store/dashboard/dashboard.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUnreadCount } from "@/store/notification/notification.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import { formatCurrencyRounded as money } from "@/utils/currency";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "Saturday, 31 Oct" */
const longDate = (day: string) => {
  const date = new Date(`${day}T00:00:00Z`);
  return `${DAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${SHORT_MONTHS[date.getUTCMonth()]}`;
};

const todayAppointmentsQuery = (day: string) => ({
  date: day,
  limit: 100,
  page: 1,
  reset: true,
  search: "",
  sort_by: "scheduled_at",
  sort_order: "ASC" as const,
  status: undefined,
});

const QUICK_ACTIONS: { icon: IconName; label: string; a11y: string; href: Href }[] = [
  { icon: "calendar", label: "Book", a11y: "Book", href: "/bookings/new" },
  { icon: "bolt", label: "Sale", a11y: "Sale", href: "/quick-sale" },
  { icon: "userAdd", label: "Client", a11y: "Add client", href: "/clients/new" },
  { icon: "expense", label: "Expense", a11y: "Expense", href: "/expenses?create=1" as Href },
];

type Sheet = null | "menu" | "salon" | "notifications";

export default function DashboardScreen() {
  "use no memo";
  useRegionalPreferences();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAuth();
  const didRunStartupFetchRef = useRef<string | null>(null);
  const canLoadAttendance = canAccessBusinessModule(user, "view_staff", "view_attendance");
  const canLoadAppointments = canAccessBusinessModule(user, "view_dashboard_card_appointments", "view_appointment", "view_calendar");
  const canLoadInventory = canAccessBusinessModule(user, "view_inventory", "view_products");
  const canLoadStaff = canAccessBusinessModule(user, "view_staff");
  const canLoadClients = canAccessBusinessModule(user, "view_clients");
  const [sheet, setSheet] = useState<Sheet>(null);
  const dashboardStatus = useAppSelector(selectDashboardStatus);
  const dashboardLocked = useAppSelector(selectDashboardModuleLocked);
  const { isOnline } = useNetworkStatus();
  const wasOnline = useRef(isOnline);
  const today = useSalonDay();
  const previousDay = useRef(today);
  const showErrorState = isOnline && dashboardStatus === "failed";

  const fetchDashboard = useCallback(async () => {
    if (!isAuthenticated) return;
    await dispatch(fetchDashboardThunk());
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    const reconnected = !wasOnline.current && isOnline;
    wasOnline.current = isOnline;
    if (reconnected) void fetchDashboard();
  }, [isOnline, fetchDashboard]);

  const fetchAttendance = useCallback(() => {
    if (isAuthenticated && canLoadAttendance) void dispatch(fetchAttendanceOverviewThunk());
  }, [dispatch, isAuthenticated, canLoadAttendance]);

  const fetchUnreadNotificationCount = useCallback(() => {
    if (isAuthenticated) void dispatch(fetchUnreadCountThunk());
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (previousDay.current === today) return;
    previousDay.current = today;
    void fetchDashboard();
    fetchAttendance();
    if (isAuthenticated && canLoadAppointments) void dispatch(fetchAppointmentsThunk(todayAppointmentsQuery(today)));
  }, [today, fetchDashboard, fetchAttendance, dispatch, isAuthenticated, canLoadAppointments]);

  const fetchInventoryStock = useCallback(() => {
    if (isAuthenticated && canLoadInventory) void dispatch(fetchInventorySummaryThunk());
  }, [dispatch, isAuthenticated, canLoadInventory]);

  const fetchUpcomingAppointments = useCallback(() => {
    if (isAuthenticated && canLoadAppointments) void dispatch(fetchAppointmentsThunk(todayAppointmentsQuery(today)));
  }, [dispatch, isAuthenticated, today, canLoadAppointments]);

  const fetchStartupData = useCallback(() => {
    if (!isAuthenticated) return;
    void Promise.allSettled([
      dispatch(fetchDashboardThunk()),
      ...(canLoadAttendance ? [dispatch(fetchAttendanceOverviewThunk())] : []),
      ...(canLoadInventory ? [dispatch(fetchInventorySummaryThunk())] : []),
      ...(canLoadAppointments ? [dispatch(fetchAppointmentsThunk(todayAppointmentsQuery(today)))] : []),
      dispatch(fetchUnreadCountThunk()),
      dispatch(fetchNotificationsThunk({ refresh: true })),
      ...(canLoadInventory ? [dispatch(fetchProductsThunk({ offset: 0, reset: true }))] : []),
      ...(canLoadStaff ? [dispatch(fetchStaffThunk({ page: 1, reset: true }))] : []),
      ...(canLoadClients ? [dispatch(fetchClientsThunk({ offset: 0, reset: true, refresh: true }))] : []),
    ]);
  }, [dispatch, isAuthenticated, today, canLoadAppointments, canLoadAttendance, canLoadInventory, canLoadStaff, canLoadClients]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    const identity = `${user.id}:${user.salonId}:${canLoadAttendance}:${canLoadAppointments}:${canLoadInventory}:${canLoadStaff}:${canLoadClients}`;
    if (didRunStartupFetchRef.current === identity) return;
    didRunStartupFetchRef.current = identity;
    if (canLoadAttendance) void dispatch(hydrateAttendanceFromCacheThunk());
    fetchStartupData();
  }, [dispatch, fetchStartupData, isAuthenticated, user?.id, user?.salonId, canLoadAttendance, canLoadAppointments, canLoadInventory, canLoadStaff, canLoadClients]);

  // No automatic refresh when returning to this screen or to the app: the owner
  // refreshes by pulling down. Only a new day and reconnecting update it silently.

  useEffect(() => {
    if (!isAuthenticated || !canLoadClients) return;
    const socket = realtimeSocket.activeSocket;
    if (!socket?.connected) return;
    const handleClientCreated = () => { dispatch(fetchClientsThunk({ offset: 0, reset: true, refresh: true })); };
    socket.on("client:created", handleClientCreated);
    socket.on("client_created", handleClientCreated);
    socket.on("new_client", handleClientCreated);
    return () => {
      socket.off("client:created", handleClientCreated);
      socket.off("client_created", handleClientCreated);
      socket.off("new_client", handleClientCreated);
    };
  }, [dispatch, isAuthenticated, canLoadClients]);

  // The spinner shows only for a pull-to-refresh, never for silent background updates.
  const [pulling, setPulling] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => {
    if (!isAuthenticated) return;
    setPulling(true);
    setRefreshKey(key => key + 1);
    fetchUpcomingAppointments();
    fetchAttendance();
    fetchInventoryStock();
    fetchUnreadNotificationCount();
    void fetchDashboard().finally(() => setPulling(false));
  };

  return (
    <>
      <Page header={<DashboardHeader onOpen={setSheet} />} refreshing={pulling} onRefresh={refresh}>
        <Text style={[pearlType.small, { paddingHorizontal: 2 }]}>{longDate(today)}</Text>
        {isStaffAccount(user) && <StaffAttendanceCard compact />}
        {dashboardLocked ? <DashboardUpgradeRequired /> : showErrorState ? <LoadError onRetry={() => void fetchDashboard()} /> : (
          <>
            {(!isStaffAccount(user) || isManagerAccount(user)) && canAccessBusinessModule(user, "view_dashboard_card_total_revenue") && <RevenueHero />}
            <LunoxInsightCard refreshKey={refreshKey} />
            <View style={styles.bleed}><SpotlightAnnouncementCard /></View>
            <StatsRow />
            <View style={styles.qa}>
              {QUICK_ACTIONS.filter(action => canAccessBusinessModule(user, ...(action.label === "Book" ? ["create_appointment"] : action.label === "Sale" ? ["access_quick_sale"] : action.label === "Client" ? ["create_clients", "add_client"] : ["view_cash_management"])) && (action.label !== "Expense" || canAccessBusinessModule(user, "add_expense"))).map(action => (
                <Pressable key={action.label} onPress={() => router.push(action.href)} style={styles.qaItem} accessibilityRole="button" accessibilityLabel={action.a11y}>
                  {({ pressed }) => (
                    <>
                      <View style={[styles.qaButton, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}><Icon name={action.icon} size={20} color={pearl.accent} /></View>
                      <Text translate style={styles.qaLabel}>{action.label}</Text>
                    </>
                  )}
                </Pressable>
              ))}
            </View>
            {canAccessBusinessModule(user, "view_dashboard_card_appointments", "view_appointment") && <NextAppointments refreshKey={refreshKey} />}
            {canAccessBusinessModule(user, "view_staff", "view_attendance") && <StaffOnFloor />}
          </>
        )}
      </Page>
      <MenuDrawer visible={sheet === "menu"} onClose={() => setSheet(null)} />
      <SalonSwitchSheet visible={sheet === "salon"} onClose={() => setSheet(null)} />
      <NotificationsSheet visible={sheet === "notifications"} onClose={() => setSheet(null)} />
      <AttendanceToast />
    </>
  );
}

function DashboardHeader({ onOpen }: { onOpen: (sheet: Sheet) => void }) {
  "use no memo";
  useRegionalPreferences();
  const user = useAppSelector(selectCurrentUser);
  const activeBranch = useAppSelector(selectActiveBranch);
  const canSwitch = useAppSelector(selectShouldShowBranchSelector);
  const unread = useAppSelector(selectUnreadCount);
  const salonName = activeBranch?.name?.trim() || user?.businessName?.trim() || "Salon";

  return (
    <View style={styles.top}>
      <IconButton icon="menu" label="Menu" onPress={() => onOpen("menu")} />
      <Pressable onPress={canSwitch ? () => onOpen("salon") : undefined} disabled={!canSwitch} style={styles.salonPill}
        accessibilityRole={canSwitch ? "button" : "text"} accessibilityLabel={canSwitch ? `Switch salon, current ${salonName}` : salonName}>
        <Icon name="pin" size={16} color={pearl.accent} />
        <Text style={styles.salonText} numberOfLines={1}>{salonName}</Text>
        {canSwitch ? <Icon name="chevronDown" size={14} color={pearl.muted} /> : null}
      </Pressable>
      <IconButton icon="bell" label="Notifications" badge={unread || undefined} onPress={() => onOpen("notifications")} />
    </View>
  );
}

/** This month collected + monthly target (target from /dashboard/monthly-projection). */
function RevenueHero() {
  "use no memo";
  useRegionalPreferences();
  const salonDay = useSalonDay();
  const metrics = useAppSelector(selectDashboardMetrics);
  const loading = useAppSelector(selectDashboardIsLoading);
  const refreshedAt = useAppSelector(selectDashboardLastFetchedAt);
  const branchId = useAppSelector(selectActiveBranchId);
  const [target, setTarget] = useState<number | null | undefined>(undefined);

  // Refetched whenever the dashboard refreshes or the branch changes.
  useEffect(() => {
    let active = true;
    monthlyProjectionService.get("all")
      .then(data => { if (active) setTarget(data.target); })
      .catch(() => { if (active) setTarget(current => current ?? null); });
    return () => { active = false; };
  }, [branchId, refreshedAt]);

  if (loading && !refreshedAt) return <Skeleton h={210} r={26} />;

  const prevMonth = MONTHS[(Number(salonDay.slice(5, 7)) + 10) % 12];
  const change = metrics.revenueChange;
  const hasCompare = metrics.lastMonthRevenue > 0;
  const progress = target ? (metrics.monthlyRevenue / target) * 100 : 0;

  return (
    <HeroSurface style={styles.hero}>
      <Pressable onPress={() => router.push("/monthly-revenue" as Href)} accessibilityRole="button"
        accessibilityLabel={`This month collected ${money(metrics.monthlyRevenue)}. Open breakdown`}>
        <View style={styles.rowBetween}>
          <Text translate style={styles.eyebrow}>THIS MONTH · COLLECTED</Text>
          {hasCompare ? (
            <View style={styles.change} accessibilityLabel={`${change >= 0 ? "Up" : "Down"} ${Math.abs(change)}% on last month`}>
              <View style={change < 0 ? { transform: [{ scaleY: -1 }] } : undefined}><Icon name="trend" size={14} color="#fff" strokeWidth={2.2} /></View>
              <Text style={styles.changeText}>{Math.abs(change)}%</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.heroNum} adjustsFontSizeToFit numberOfLines={1}>{money(metrics.monthlyRevenue)}</Text>
        <Text style={styles.heroSub}>vs {money(metrics.lastMonthRevenue)} in {prevMonth} · tap for breakdown</Text>
      </Pressable>
      {target === undefined ? null : (
        <Pressable onPress={() => router.push("/month-overview" as Href)} style={styles.target} accessibilityRole="button"
          accessibilityLabel={target ? `Monthly target ${money(target)}, ${Math.round(progress)}% reached` : "Set a monthly target"}>
          {target ? (
            <>
              <View style={styles.rowBetween}>
                <Text style={styles.targetText}>Monthly target {money(target)}</Text>
                <Text style={[styles.targetText, { fontWeight: "800" }]}>{Math.round(progress)}%</Text>
              </View>
              <View style={styles.track}>
                <LinearGradient colors={["#EFEAF8", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fill, { width: `${Math.min(100, progress)}%` }]} />
              </View>
            </>
          ) : (
            <View style={styles.rowBetween}>
              <Text translate style={styles.targetText}>No monthly target yet</Text>
              <Text translate style={[styles.targetText, { fontWeight: "800" }]}>Set target ›</Text>
            </View>
          )}
        </Pressable>
      )}
      <Pressable onPress={() => router.push("/month-overview" as Href)} style={styles.heroLink} hitSlop={6} accessibilityRole="button">
        <Text translate style={styles.heroLinkText}>Compare & projection</Text>
        <Icon name="chevronRight" size={14} color="#fff" />
      </Pressable>
    </HeroSurface>
  );
}

function StatsRow() {
  "use no memo";
  useRegionalPreferences();
  const metrics = useAppSelector(selectDashboardMetrics);
  const loading = useAppSelector(selectDashboardIsLoading);
  const totalClients = useAppSelector(selectClientsTotalCount);
  const user = useAppSelector(selectCurrentUser);
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      {canAccessBusinessModule(user, "view_dashboard_card_today_revenue") && <StatTile icon="wallet" tone="lavender" label="Today" value={money(metrics.todaysRevenue)} loading={loading} onPress={() => router.push("/today-revenue" as Href)} />}
      {canAccessBusinessModule(user, "view_dashboard_card_new_clients", "view_clients") && <StatTile icon="users" tone="lilac" label="Clients" value={String(totalClients)} onPress={() => router.push("/clients" as Href)} />}
      {canAccessBusinessModule(user, "view_dashboard_card_appointments", "view_appointment") && <StatTile icon="calendar" tone="sky" label="Bookings" value={String(metrics.bookings)} loading={loading} onPress={() => router.push("/bookings" as Href)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingVertical: 8 },
  salonPill: {
    flexDirection: "row", alignItems: "center", gap: 8, height: 42, paddingHorizontal: 14, borderRadius: 21, maxWidth: "58%", flexShrink: 1,
    backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder, ...pearlShadow.card,
  },
  salonText: { fontWeight: "700", fontSize: 13.5, color: pearl.ink, flexShrink: 1 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  hero: { padding: 18, paddingBottom: 16 },
  eyebrow: { fontWeight: "800", fontSize: 11, letterSpacing: 0.8, color: "rgba(255,255,255,0.85)" },
  change: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.22)", borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" },
  changeText: { fontWeight: "800", fontSize: 12, color: "#fff" },
  heroNum: { fontWeight: "800", fontSize: 38, lineHeight: 46, letterSpacing: -1, color: "#fff", marginTop: 6 },
  heroSub: { fontWeight: "500", fontSize: 12.5, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  target: { marginTop: 14, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", gap: 7 },
  targetText: { fontWeight: "600", fontSize: 12, color: "#fff" },
  track: { height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  heroLink: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 12, alignSelf: "flex-start" },
  heroLinkText: { fontWeight: "700", fontSize: 13, color: "#fff" },
  bleed: { marginHorizontal: -18 },
  qa: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6 },
  qaItem: { alignItems: "center", gap: 6 },
  qaLabel: { fontSize: 12, fontWeight: "700", color: pearl.ink2 },
  qaButton: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder, ...pearlShadow.card },
});
