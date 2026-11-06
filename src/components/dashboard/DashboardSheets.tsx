/**
 * Dashboard overlays (prototype): notifications, side menu and salon switch.
 * All actions use the existing thunks / routes.
 */
import { router, type Href } from "expo-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Reanimated, { Easing as ReEasing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { pearl, pearlShadow, pearlTones, pearlType, type PearlTone } from "@/components/auth/pearl/tokens";
import { Icon, type IconName } from "@/components/pearl/Icon";
import { BottomSheet, SideDrawer } from "@/components/pearl/Sheet";
import { Avatar, Card, Divider, EmptyState, ListRow, Skeleton, SmallButton, StatusPill, Tile } from "@/components/pearl/ui";
import { Text } from "@/components/ui/AppTypography";
import { useAuth } from "@/context/AuthContext";
import { useAppToast } from "@/hooks/useAppToast";
import { fetchBranchesThunk, selectBranchThunk } from "@/middleware/branch/branch.thunk";
import { clearAllNotificationsThunk, fetchNotificationsThunk, removeLocalNotificationThunk } from "@/middleware/notification/notification.thunk";
import { selectActiveBranch, selectActiveBranchId, selectBranchStatus, selectIsSwitchingBranch, selectVisibleBranches } from "@/store/branch/branch.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectClearingAllNotifications, selectNotifications, selectNotificationsListLoading } from "@/store/notification/notification.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import type { NotificationItem } from "@/types/notification";
import { resolveNotificationRoute } from "@/utils/notificationRouting";
import { hasInventoryPermission } from "@/utils/permissions";
import { getUserBusinessName, getUserFullName, getUserInitials } from "@/utils/userProfile";

// Let a sheet finish closing before the next screen slides in.
const afterClose = (action: () => void) => setTimeout(action, 240);

/* ───────────────────────── Notifications ───────────────────────── */

const notificationLook = (type: string): { icon: IconName; tone: PearlTone } => {
  const key = type.toLowerCase();
  if (/pay|invoice|sale|bill|refund/.test(key)) return { icon: "wallet", tone: "lavender" };
  if (/appoint|book|calendar/.test(key)) return { icon: "calendar", tone: "lilac" };
  if (/stock|inventor|product|audit/.test(key)) return { icon: "box", tone: "sky" };
  if (/attend|leave|staff|check/.test(key)) return { icon: "alert", tone: "danger" };
  if (/campaign|market|whatsapp|message/.test(key)) return { icon: "send", tone: "lavender" };
  return { icon: "bell", tone: "lavender" };
};

/**
 * One list. Tapping a notification opens it and clears it from the list;
 * "Mark all read" clears the whole list.
 */
export function NotificationsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const toast = useAppToast();
  const notifications = useAppSelector(selectNotifications);
  const loading = useAppSelector(selectNotificationsListLoading);
  const clearingAll = useAppSelector(selectClearingAllNotifications);
  const unread = useMemo(() => notifications.filter(item => !item.isRead).length, [notifications]);

  useEffect(() => {
    if (visible) void dispatch(fetchNotificationsThunk({ refresh: true }));
  }, [dispatch, visible]);

  const openOne = (item: NotificationItem) => {
    void dispatch(removeLocalNotificationThunk(item.id));
    onClose();
    afterClose(() => router.push(resolveNotificationRoute(item)));
  };

  const markAllRead = () => {
    if (!notifications.length || clearingAll) return;
    void dispatch(clearAllNotificationsThunk(notifications.map(item => item.id))).unwrap().catch(() => {
      toast.showError("Couldn’t clear notifications. Please try again.");
    });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      tall
      title="Notifications"
      subtitle={unread ? `${unread} new` : "Nothing new"}
      headerRight={notifications.length ? (
        <Pressable onPress={markAllRead} disabled={clearingAll} hitSlop={8} accessibilityRole="button" accessibilityHint="Clears all notifications" style={{ marginRight: 4, opacity: clearingAll ? 0.5 : 1 }}>
          <Text style={pearlType.link}>Mark all read</Text>
        </Pressable>
      ) : null}
    >
      {loading && !notifications.length ? (
        <View style={{ gap: 10 }}><Skeleton h={64} /><Skeleton h={64} /><Skeleton h={64} /></View>
      ) : notifications.length ? (
        <>
          <Card>
            {notifications.map((item, index) => {
              const look = notificationLook(item.type);
              const subtitle = [item.body, item.createdDateLabel].filter(Boolean).join(" · ");
              return (
                <Pressable
                  key={item.id}
                  onPress={() => openOne(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.isRead ? "" : "New. "}${item.title || "SalonOX alert"}. ${subtitle}`}
                  style={({ pressed }) => [styles.notice, index > 0 && styles.sep, pressed && { backgroundColor: "rgba(255,255,255,0.55)" }]}
                >
                  <View>
                    <Tile icon={look.icon} tone={look.tone} />
                    {!item.isRead ? <View style={styles.unreadDot} /> : null}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={pearlType.bodyStrong} numberOfLines={1}>{item.title || "SalonOX alert"}</Text>
                    <Text style={[pearlType.small, { marginTop: 2 }]} numberOfLines={2}>{subtitle}</Text>
                  </View>
                  <Icon name="chevronRight" size={16} color={pearl.muted} />
                </Pressable>
              );
            })}
          </Card>
          <Text style={[pearlType.small, { textAlign: "center" }]}>Tap a notification to open it. “Mark all read” clears the list.</Text>
        </>
      ) : (
        <EmptyState icon="check" title="You’re all caught up" body="New payments, bookings, stock alerts and staff updates will appear here." />
      )}
    </BottomSheet>
  );
}

/* ───────────────────────── Side menu ───────────────────────── */

type MenuLink = { icon: IconName; label: string; href?: Href; soon?: string; tone?: PearlTone };

const GO_TO: MenuLink[] = [
  { icon: "users", tone: "lilac", label: "Clients", href: "/clients" },
  { icon: "idCard", tone: "lavender", label: "Staff", href: "/team" },
  { icon: "clock", tone: "sky", label: "Attendance", href: "/team/attendance" },
  { icon: "scissors", tone: "lavender", label: "Catalog", href: "/catalog" },
  { icon: "chart", tone: "lilac", label: "Reports", href: "/reports" },
  { icon: "percent", tone: "sky", label: "Commissions", href: "/team/commissions" },
];
const PRODUCT_AUDIT: MenuLink = { icon: "box", tone: "lilac", label: "Product audit", href: "/product-audits" as Href };
/** Everything WhatsApp lives under Marketing. */
const MARKETING: MenuLink[] = [
  { icon: "chart", label: "Campaigns", href: "/marketing" as Href },
  // TODO(new-campaign): link the mobile campaign builder once it exists.
  { icon: "send", label: "New campaign", soon: "Creating campaigns in the app is coming soon." },
  { icon: "chat", label: "WhatsApp inbox", href: "/inbox" as Href },
  { icon: "trend", label: "WhatsApp insights", href: "/marketing/insights" as Href },
];
const CREATE: MenuLink[] = [
  { icon: "userAdd", label: "Client", href: "/clients/new" },
  { icon: "idCard", label: "Staff", href: "/team/new" },
  { icon: "scissors", label: "Service", href: "/services/new" },
  { icon: "bag", label: "Product", href: "/stock/new" },
  { icon: "expense", label: "Expense", href: "/sales" },
  { icon: "calendar", label: "Booking", href: "/bookings/new" },
];
const ADMIN: MenuLink[] = [
  { icon: "shield", tone: "lavender", label: "Staff permissions", href: "/team/permissions" },
  { icon: "gear", tone: "lilac", label: "Settings", href: "/more" },
];

/** "salon_owner" → "Owner" (prototype: "Priya Sharma · Owner"). */
const ROLE_NAMES: Record<string, string> = { salon_owner: "Owner", owner: "Owner", admin: "Admin", super_admin: "Admin", branch_owner: "Branch owner", manager: "Manager", receptionist: "Receptionist", staff: "Staff" };
const roleName = (role?: string | null) => {
  const key = (role ?? "").trim().toLowerCase();
  if (!key) return "";
  return ROLE_NAMES[key] ?? key.replace(/[_-]+/g, " ").replace(/^w/, char => char.toUpperCase());
};

/** Places to go are separated from things to create; Settings lives here, not in the tab bar. */
export function MenuDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { signOut } = useAuth();
  const toast = useAppToast();
  const user = useAppSelector(selectCurrentUser);
  const activeBranch = useAppSelector(selectActiveBranch);
  const [marketingOpen, setMarketingOpen] = useState(false);
  // The plane icon turns 180° with a .2s transition when Marketing opens or closes; the chevron stays pointing down.
  // Reanimated keeps the angle through the re-render that shows the sub-list
  // (a native-driver Animated value snaps back to 0° on the new architecture).
  const turn = useSharedValue(0);
  const planeStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  // The angle always follows the open/closed state, so the two can never get out of step.
  useEffect(() => {
    turn.value = withTiming(marketingOpen ? 180 : 0, { duration: 200, easing: ReEasing.ease });
  }, [marketingOpen, turn]);
  const toggleMarketing = () => setMarketingOpen(open => !open);
  const canAudit = useMemo(() => hasInventoryPermission(user, "view_product_audit"), [user]);
  const salonName = activeBranch?.name?.trim() || getUserBusinessName(user) || "Your salon";
  const who = [getUserFullName(user), roleName(user?.role)].filter(Boolean).join(" · ");

  const go = (link: MenuLink) => {
    if (link.soon) { toast.showInfo(link.soon); return; }
    onClose();
    if (link.href) afterClose(() => router.push(link.href!));
  };

  return (
    <SideDrawer visible={visible} onClose={onClose}>
      <Pressable onPress={() => go({ icon: "user", label: "Profile", href: "/profile" })} style={({ pressed }) => [styles.me, pressed && styles.pressed]}
        accessibilityRole="button" accessibilityLabel={`${salonName}, ${who}. Open profile`}>
        <Avatar initials={getUserInitials(user)} size={44} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={pearlType.bodyStrong} numberOfLines={1}>{salonName}</Text>
          {who ? <Text style={pearlType.small} numberOfLines={1}>{who}</Text> : null}
        </View>
      </Pressable>

      <Text style={styles.group}>GO TO</Text>
      {GO_TO.map(link => <MenuRow key={link.label} link={link} onPress={() => go(link)} />)}

      <View>
        <Pressable onPress={toggleMarketing} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
          accessibilityRole="button" accessibilityState={{ expanded: marketingOpen }} accessibilityHint="Shows WhatsApp campaigns, inbox and insights">
          {/* Prototype `.mk-toggle.on .ic:last-child` turns the plane icon too. */}
          <View style={styles.planeTile}>
            <Reanimated.View style={planeStyle}><Icon name="send" size={18} color={pearlTones.lavender.fg} /></Reanimated.View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowText}>Marketing</Text>
            <Text style={styles.rowHint}>WhatsApp campaigns, inbox & insights</Text>
          </View>
          <Icon name="chevronDown" size={16} />
        </Pressable>
        {marketingOpen ? (
          <View style={styles.sub}>
            {MARKETING.map(link => (
              <Pressable key={link.label} onPress={() => go(link)} style={({ pressed }) => [styles.subRow, pressed && styles.subPressed]} accessibilityRole="button">
                <Icon name={link.icon} size={16} color={pearl.accent} />
                <Text style={styles.subText}>{link.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      {canAudit ? <MenuRow link={PRODUCT_AUDIT} onPress={() => go(PRODUCT_AUDIT)} /> : null}

      <Text style={styles.group}>CREATE</Text>
      <View style={styles.grid}>
        {CREATE.map(link => (
          <Pressable key={link.label} onPress={() => go(link)} style={({ pressed }) => [styles.create, pressed && styles.pressed]}
            accessibilityRole="button" accessibilityLabel={`Add ${link.label.toLowerCase()}`}>
            <Icon name={link.icon} size={18} color={pearl.accent} />
            <Text style={styles.createText}>{link.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.group}>ADMIN</Text>
      {ADMIN.map(link => <MenuRow key={link.label} link={link} onPress={() => go(link)} />)}

      <Pressable onPress={() => { onClose(); void signOut(); }} style={styles.signOut} accessibilityRole="button">
        <Icon name="logout" size={18} color={pearl.muted} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </SideDrawer>
  );
}

function MenuRow({ link, onPress }: { link: MenuLink; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]} accessibilityRole="button">
      <Tile icon={link.icon} tone={link.tone} size={36} />
      <Text style={[styles.rowText, { flex: 1 }]}>{link.label}</Text>
      <Icon name="chevronRight" size={16} />
    </Pressable>
  );
}

/* ───────────────────────── Salon switch ───────────────────────── */

const BRANCH_TONES: PearlTone[] = ["lavender", "lilac", "sky"];

export function SalonSwitchSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const toast = useAppToast();
  const branches = useAppSelector(selectVisibleBranches);
  const activeBranchId = useAppSelector(selectActiveBranchId);
  const status = useAppSelector(selectBranchStatus);
  const isSwitching = useAppSelector(selectIsSwitchingBranch);

  const pick = (id: string, name: string) => {
    if (id === activeBranchId || isSwitching) return;
    void dispatch(selectBranchThunk(id));
    onClose();
    toast.showSuccess(`Switched to ${name}`);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Your salons">
      {status === "failed" ? (
        <EmptyState icon="alert" title="Couldn’t load your salons" body="Please check your connection and try again."
          action={<View style={{ marginTop: 8 }}><SmallButton title="Try again" icon="repeat" primary onPress={() => void dispatch(fetchBranchesThunk())} /></View>} />
      ) : !branches.length ? <Skeleton h={180} /> : (
        <Card>
          {branches.map((branch, index) => (
            <Fragment key={branch.id}>
              {index > 0 ? <Divider /> : null}
              <ListRow
                left={<Tile icon="store" tone={BRANCH_TONES[index % BRANCH_TONES.length]} />}
                title={branch.name}
                subtitle={branch.city || undefined}
                right={branch.id === activeBranchId ? <StatusPill tone="success" label="Current" /> : <Icon name="chevronRight" size={16} />}
                onPress={branch.id === activeBranchId ? undefined : () => pick(branch.id, branch.name)}
              />
            </Fragment>
          ))}
        </Card>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  pressed: { backgroundColor: "rgba(255,255,255,0.5)" },
  notice: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  sep: { borderTopWidth: 1, borderTopColor: pearl.divider },
  unreadDot: { position: "absolute", top: -3, right: -3, width: 10, height: 10, borderRadius: 5, backgroundColor: pearl.danger, borderWidth: 2, borderColor: "#fff" },
  // Drawer (prototype .drow / .drawer-grp / .dsub / .stat.mini / .btn-text)
  me: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 6, paddingBottom: 6, borderRadius: 16 },
  group: { fontWeight: "800", fontSize: 10.5, letterSpacing: 0.9, color: pearl.muted, marginTop: 6, marginBottom: -6, marginHorizontal: 6 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, paddingHorizontal: 8, borderRadius: 14 },
  rowText: { fontSize: 14, fontWeight: "700", color: pearl.ink },
  planeTile: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: pearlTones.lavender.bg },
  rowHint: { fontSize: 11, fontWeight: "600", color: pearl.muted, marginTop: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingVertical: 6, paddingHorizontal: 2 },
  create: { width: "47%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 20, backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder, ...pearlShadow.card },
  createText: { fontSize: 13, fontWeight: "700", color: pearl.ink },
  sub: { marginLeft: 26, marginBottom: 4, paddingLeft: 16, borderLeftWidth: 2, borderLeftColor: "#CFCBE8" },
  subRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, paddingHorizontal: 8, borderRadius: 12 },
  subPressed: { backgroundColor: "rgba(255,255,255,0.6)" },
  subText: { flex: 1, fontSize: 13.5, fontWeight: "600", color: pearl.ink },
  signOut: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, alignSelf: "center", height: 48, paddingHorizontal: 12 },
  signOutText: { fontSize: 14, fontWeight: "700", color: pearl.muted },
});
