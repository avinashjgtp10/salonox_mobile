import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import { addRealtimeEntityChangedListener } from "@/services/realtimeEvents";
import { clientService } from "@/services/client.service";
import {
  assignClientMembershipThunk,
  cancelClientMembershipThunk,
  changeClientMembershipThunk,
  fetchClientMembershipsThunk,
  renewClientMembershipThunk,
} from "@/middleware/clientMembership/clientMembership.thunk";
import {
  fetchClientByIdThunk,
  fetchClientHistoryThunk,
  fetchClientsWithHistoryStatsThunk,
  updateBlockThunk,
  unblockClientThunk,
} from "@/middleware/client/client.thunk";
import {
  selectClientById,
  selectClientDetailsError,
  selectClientDetailsLoading,
  selectClientHistory,
  selectClientHistoryLoading,
  selectClientHistoryError,
  selectClientHistoryStats,
  selectClientBlockingIds,
} from "@/store/client/client.slice";
import { useAppToast } from "@/hooks/useAppToast";
import { fetchMembershipsThunk } from "@/middleware/membership/membership.thunk";
import {
  selectActiveClientMembership,
  selectClientMembershipMutationError,
  selectClientMembershipMutating,
  selectClientMembershipsByClient,
  selectClientMembershipsError,
  selectClientMembershipsLoading,
} from "@/store/clientMembership/clientMembership.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectMemberships } from "@/store/membership/membership.slice";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { Membership } from "@/types/membership";
import { formatAppDate } from "@/utils/dateTime";

function formatCurrency(amount: number) {
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

function formatCreatedDate(createdAt: string | null) {
  return formatAppDate(createdAt, "-");
}

function formatStatusLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function getMembershipStatusTone(status: string, Colors: ThemeColors) {
  if (status === "active") return { bg: Colors.successBg, color: Colors.success };
  if (status === "expired") return { bg: Colors.warningBg, color: Colors.goldDark };
  return { bg: Colors.errorBg, color: Colors.error };
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

type ClientTab = "summary" | "activity" | "profile" | "notes";

const CLIENT_TABS: { key: ClientTab; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "activity", label: "Activity" },
  { key: "profile", label: "Profile" },
  { key: "notes", label: "Notes" },
];

function EmptySummarySection({
  icon = "gift-outline",
  label,
  title,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  title: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.summarySection}>
      <Text style={styles.summarySectionTitle}>{title}</Text>
      <View style={styles.emptySummaryBox}>
        <View style={styles.emptySummaryIcon}>
          <Ionicons color={Colors.text2} name={icon} size={28} />
        </View>
        <Text style={styles.emptySummaryText}>{label}</Text>
      </View>
    </View>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function MembershipPickerModal({
  memberships,
  onClose,
  onSelect,
  saving,
  visible,
}: {
  memberships: Membership[];
  onClose: () => void;
  onSelect: (membership: Membership) => void;
  saving: boolean;
  visible: boolean;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.modalOverlay}>
        <Pressable style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Membership</Text>
            <TouchableOpacity onPress={onClose} style={styles.pickerClose}>
              <Ionicons name="close" size={18} color={Colors.text2} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.pickerList}>
            {memberships.map((membership) => (
              <TouchableOpacity
                activeOpacity={0.84}
                disabled={saving}
                key={membership.id}
                onPress={() => onSelect(membership)}
                style={styles.membershipOption}
              >
                <View style={styles.membershipOptionIcon}>
                  <Ionicons name="diamond-outline" size={18} color={Colors.primary} />
                </View>
                <View style={styles.membershipOptionCopy}>
                  <Text numberOfLines={1} style={styles.membershipOptionTitle}>
                    {membership.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.membershipOptionMeta}>
                    {membership.validFor} - {membership.sessionType}
                  </Text>
                </View>
                {saving ? <ActivityIndicator color={Colors.primary} size="small" /> : null}
              </TouchableOpacity>
            ))}
            {memberships.length === 0 ? (
              <Text style={styles.notesText}>No membership plans available.</Text>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function ClientDetailsScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const dispatch = useAppDispatch();
  const toast = useAppToast();

  const liveClient = useAppSelector((state) => selectClientById(state, id));
  const detailsLoading = useAppSelector(selectClientDetailsLoading);
  const detailsError = useAppSelector(selectClientDetailsError);

  const rawHistory = useAppSelector(selectClientHistory);
  const history = Array.isArray(rawHistory) ? rawHistory : [];
  const historyLoading = useAppSelector(selectClientHistoryLoading);
  const historyError = useAppSelector(selectClientHistoryError);

  const historyStats = useAppSelector(selectClientHistoryStats);
  const blockingIds = useAppSelector(selectClientBlockingIds);
  const memberships = useAppSelector(selectMemberships);
  const clientMemberships = useAppSelector(selectClientMembershipsByClient(id));
  const activeMembership = useAppSelector(selectActiveClientMembership(id));
  const membershipLoading = useAppSelector(selectClientMembershipsLoading(id));
  const membershipError = useAppSelector(selectClientMembershipsError(id));
  const membershipMutating = useAppSelector(selectClientMembershipMutating);
  const membershipMutationError = useAppSelector(selectClientMembershipMutationError);
  const clientStats = historyStats[id ?? ""];
  const isBlocking = id ? blockingIds.includes(id) : false;
  const [pickerVisible, setPickerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<ClientTab>("summary");

  useEffect(() => {
    if (id) {
      void dispatch(fetchClientByIdThunk(id));
      void dispatch(fetchClientHistoryThunk(id));
      void dispatch(fetchClientMembershipsThunk(id));
      void dispatch(fetchMembershipsThunk({ limit: 50, refresh: true }));
    }
  }, [id, dispatch]);

  useEffect(
    () =>
      addRealtimeEntityChangedListener(({ entity }) => {
        if (id && (entity === "clientMemberships" || entity === "memberships" || entity === "clients")) {
          void dispatch(fetchClientByIdThunk(id));
          void dispatch(fetchClientMembershipsThunk(id));
        }
      }),
    [dispatch, id],
  );

  useEffect(() => {
    if (id && liveClient) {
      void dispatch(fetchClientsWithHistoryStatsThunk({ search: liveClient.fullName }));
    }
  }, [id, liveClient, dispatch]);

  const client = useMemo(() => {
    if (!liveClient) {
      return null;
    }

    const avatarTone = clientService.getAvatarTone(liveClient.id);
    const isClientInactive = liveClient.inactive || liveClient.status.toLowerCase() === "blocked" || liveClient.status.toLowerCase() === "inactive";

    return {
      avatarBg: avatarTone.background,
      avatarColor: avatarTone.color,
      city: liveClient.gender === "-" ? "-" : "India",
      createdLabel: liveClient.createdDateLabel,
      email: liveClient.email,
      favoriteService: liveClient.membership ?? "No preference added",
      fullName: liveClient.fullName,
      gender: liveClient.gender,
      id: liveClient.id,
      initials: liveClient.initials,
      membership: liveClient.membership,
      notes: isClientInactive ? "Client is blocked/inactive." : "No notes added.",
      phone: liveClient.phone,
      preferredStaff: "-",
      status: liveClient.status,
      isBlocked: isClientInactive,
      totalVisits: liveClient.totalVisits,
    };
  }, [liveClient]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/clients" as Href);
  };

  const handleBlockToggle = () => {
    if (!client) return;

    if (client.isBlocked) {
      Alert.alert(
        "Unblock Client",
        `Are you sure you want to unblock "${client.fullName}"?`,
        [
          { style: "cancel", text: "Cancel" },
          {
            onPress: async () => {
              const res = await dispatch(unblockClientThunk(client.id));
              if (unblockClientThunk.fulfilled.match(res)) {
                void dispatch(fetchClientByIdThunk(client.id));
                toast.showSuccess("Client unblocked successfully.");
              } else {
                Alert.alert("Error", res.payload?.message ?? "Unable to unblock client.");
              }
            },
            text: "Unblock",
          },
        ]
      );
    } else {
      Alert.alert(
        "Block Client",
        `Are you sure you want to block "${client.fullName}"?`,
        [
          { style: "cancel", text: "Cancel" },
          {
            onPress: async () => {
              const res = await dispatch(
                updateBlockThunk({ clientId: client.id, reason: "Blocked by staff action" })
              );
              if (updateBlockThunk.fulfilled.match(res)) {
                void dispatch(fetchClientByIdThunk(client.id));
                toast.showSuccess("Client blocked successfully.");
              } else {
                Alert.alert("Error", res.payload?.message ?? "Unable to block client.");
              }
            },
            text: "Block",
          },
        ]
      );
    }
  };

  const handleSelectMembership = async (membership: Membership) => {
    if (!client) return;
    const result = activeMembership
      ? await dispatch(
          changeClientMembershipThunk({
            assignmentId: activeMembership.id,
            data: { membershipId: membership.id },
          }),
        )
      : await dispatch(assignClientMembershipThunk({ clientId: client.id, membershipId: membership.id }));

    if (assignClientMembershipThunk.fulfilled.match(result) || changeClientMembershipThunk.fulfilled.match(result)) {
      setPickerVisible(false);
    }
  };

  const handleRenewMembership = async () => {
    if (!activeMembership) return;
    await dispatch(renewClientMembershipThunk({ assignmentId: activeMembership.id }));
  };

  const handleCancelMembership = () => {
    if (!activeMembership) return;
    Alert.alert("Cancel Membership", `Cancel ${activeMembership.membershipName} for this client?`, [
      { style: "cancel", text: "Keep" },
      {
        onPress: () => void dispatch(cancelClientMembershipThunk({ assignmentId: activeMembership.id })),
        style: "destructive",
        text: "Cancel Membership",
      },
    ]);
  };

  if (detailsLoading) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.notFoundWrap}>
          <View style={styles.headerRow}>
            <TouchableOpacity activeOpacity={0.8} hitSlop={AppLayout.headerActionHitSlop} onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Client Profile</Text>
            <View style={[styles.backButton, { opacity: 0 }]} />
          </View>
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (detailsError) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.notFoundWrap}>
          <View style={styles.headerRow}>
            <TouchableOpacity activeOpacity={0.8} hitSlop={AppLayout.headerActionHitSlop} onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Client Profile</Text>
            <View style={[styles.backButton, { opacity: 0 }]} />
          </View>
          <View style={styles.notFoundCard}>
            <Text style={styles.notFoundTitle}>Unable to load client</Text>
            <Text style={styles.notFoundSubtitle}>{detailsError}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!client) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.notFoundWrap}>
          <TouchableOpacity activeOpacity={0.8} hitSlop={AppLayout.headerActionHitSlop} onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.notFoundCard}>
            <Text style={styles.notFoundTitle}>Client not found</Text>
            <Text style={styles.notFoundSubtitle}>
              This client profile could not be found.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const serviceCount = history.reduce((total, item) => total + item.items.filter((entry) => entry.type === "service").length, 0);
  const productCount = history.reduce((total, item) => total + item.items.filter((entry) => entry.type === "product").length, 0);
  const appointmentCount = history.filter((item) => item.type === "appointment").length;
  const latestService = history.flatMap((item) => item.items).find((entry) => entry.type === "service")?.name ?? "-";

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <AppBackButton onPress={handleBack} />
          <View style={styles.headerTitleGroup}>
            <View style={styles.headerAvatar}><Ionicons color="#FFFFFF" name="person" size={18} /></View>
            <Text style={styles.headerTitle}>Client</Text>
          </View>
          <TouchableOpacity activeOpacity={0.75} hitSlop={AppLayout.headerActionHitSlop} onPress={() => router.push(`/clients/${client.id}/edit` as Href)} style={styles.headerIconButton}>
            <Ionicons color={Colors.heading} name="create" size={25} />
          </TouchableOpacity>
        </View>

        <View style={styles.clientHero}>
          <View style={styles.clientIdentityRow}>
            <View style={styles.profileAvatar}><Ionicons color="#FFFFFF" name="person" size={37} /></View>
            <Text numberOfLines={2} style={styles.clientName}>{client.fullName}</Text>
          </View>
          <View style={styles.contactRow}><Ionicons color={Colors.primary} name="call-outline" size={19} /><Text selectable style={styles.contactText}>{client.phone}</Text></View>
          <View style={styles.contactRow}><Ionicons color={Colors.primary} name="mail-outline" size={20} /><Text numberOfLines={1} selectable style={styles.contactText}>{client.email || "-"}</Text></View>
          <View style={styles.walletRow}>
            <TouchableOpacity activeOpacity={0.82} onPress={() => router.push("/quick-sale")} style={styles.walletPill}><Ionicons color="#FFFFFF" name="wallet-outline" size={23} /><Text style={styles.walletValue}>₹ 0</Text></TouchableOpacity>
            <TouchableOpacity activeOpacity={0.75} onPress={() => router.push("/quick-sale")} style={styles.addMoneyButton}><Ionicons color={Colors.heading} name="add-circle-outline" size={20} /><Text style={styles.addMoneyText}>Add money</Text></TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabsRow}>
          {CLIENT_TABS.map((tab) => (
            <TouchableOpacity activeOpacity={0.75} key={tab.key} onPress={() => setActiveTab(tab.key)} style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}>
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity accessibilityLabel="Client actions" activeOpacity={0.75} disabled={isBlocking} onPress={handleBlockToggle} style={styles.settingsButton}>
            {isBlocking ? <ActivityIndicator color={Colors.primary} size="small" /> : <Ionicons color={Colors.primary} name="settings-outline" size={24} />}
          </TouchableOpacity>
        </View>

        {activeTab === "summary" ? (
          <View style={styles.tabContent}>
            <View style={styles.metricsGrid}>
              {[
                { icon: "checkmark-circle-outline", label: "Total Visits", value: String(clientStats?.totalVisits ?? client.totalVisits) },
                { icon: "wallet-outline", label: "Total Spend", value: formatCurrency(clientStats?.lifetimeSpend ?? 0) },
                { icon: "receipt-outline", label: "Amount Due", value: "₹ 0" },
                { icon: "briefcase-outline", label: "Total Services", value: serviceCount ? String(serviceCount) : "-" },
                { icon: "cube-outline", label: "Total Products", value: productCount ? String(productCount) : "-" },
                { icon: "server-outline", label: "Total Points", value: "0" },
                { icon: "pie-chart-outline", label: "Average Spent", value: formatCurrency(clientStats?.averageSpend ?? 0) },
                { icon: "time-outline", label: "Last Visited On", value: clientStats?.lastVisit ? formatCreatedDate(clientStats.lastVisit) : "-" },
              ].map((metric) => (
                <View key={metric.label} style={styles.metricCell}>
                  <Ionicons color={Colors.primary} name={metric.icon as keyof typeof Ionicons.glyphMap} size={21} />
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                  <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={styles.metricValue}>{metric.value}</Text>
                </View>
              ))}
            </View>
            <EmptySummarySection label={appointmentCount ? `${appointmentCount} appointment${appointmentCount === 1 ? "" : "s"}` : "No Appointment"} title="Appointment" />
            <EmptySummarySection icon="diamond-outline" label={activeMembership?.membershipName ?? "No membership"} title="Membership" />
            <EmptySummarySection label="No vouchers" title="Vouchers" />
            <EmptySummarySection label="No Gift Card" title="Gift Cards" />
            <EmptySummarySection icon="cut-outline" label={serviceCount ? `${serviceCount} service${serviceCount === 1 ? "" : "s"}` : "No Services"} title="Services" />
            <EmptySummarySection icon="cube-outline" label={productCount ? `${productCount} product${productCount === 1 ? "" : "s"}` : "No Products"} title="Products" />
            <View style={styles.clientMetaRow}><Text style={styles.clientMetaLabel}>Joined on</Text><Text style={styles.clientMetaValue}>{client.createdLabel}</Text><Text style={styles.clientMetaLabel}>Referred by</Text><Text style={styles.clientMetaValue}>-</Text></View>
            <View style={styles.latestServiceRow}><Text style={styles.clientMetaLabel}>Latest Service Taken</Text><Text numberOfLines={1} style={styles.latestServiceValue}>{latestService}</Text></View>
          </View>
        ) : null}

        {activeTab === "activity" ? (
          <View style={styles.tabContent}>
            <Text style={styles.contentHeading}>Activity</Text>
            {historyLoading ? <ActivityIndicator color={Colors.primary} style={styles.loader} /> : null}
            {historyError ? <Text style={styles.errorText}>{historyError}</Text> : null}
            {!historyLoading && !historyError && history.length === 0 ? <EmptySummarySection icon="time-outline" label="No activity" title="" /> : null}
            {history.map((item) => (
              <View key={item.id} style={styles.activityRow}>
                <View style={styles.activityIcon}><Ionicons color={Colors.primary} name={item.type === "appointment" ? "calendar-outline" : item.type === "sale" ? "wallet-outline" : "time-outline"} size={19} /></View>
                <View style={styles.activityCopy}><Text style={styles.activityTitle}>{item.title}</Text><Text style={styles.activityMeta}>{item.dateLabel}{item.staffName ? ` · ${item.staffName}` : ""}</Text></View>
                {item.amount > 0 ? <Text style={styles.activityAmount}>{formatCurrency(item.amount)}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {activeTab === "profile" ? (
          <View style={styles.tabContent}>
            <Text style={styles.contentHeading}>Client Information</Text>
            <View style={styles.profileDetails}>
              <DetailRow label="Email" value={client.email || "-"} /><DetailRow label="Gender" value={client.gender} /><DetailRow label="Membership" value={client.membership ?? "-"} /><DetailRow label="Status" value={client.status} /><DetailRow label="Created" value={client.createdLabel} />
            </View>
            <Text style={styles.contentHeading}>Membership</Text>
            <View style={styles.profileDetails}>
              {membershipLoading ? <ActivityIndicator color={Colors.primary} style={styles.loader} /> : null}
              {membershipError ? <Text style={styles.errorText}>{membershipError}</Text> : null}
              {!membershipLoading ? <Text style={styles.membershipProfileTitle}>{activeMembership?.membershipName ?? "No active membership"}</Text> : null}
              {activeMembership ? <Text style={styles.membershipProfileMeta}>Expires {formatCreatedDate(activeMembership.expiresAt)}</Text> : null}
              <TouchableOpacity disabled={membershipMutating} onPress={() => setPickerVisible(true)} style={styles.primaryOutlineButton}><Text style={styles.primaryOutlineButtonText}>{activeMembership ? "Change Membership" : "Assign Membership"}</Text></TouchableOpacity>
            </View>
            <View style={styles.profileActions}>
              <TouchableOpacity onPress={() => router.push("/bookings/new")} style={styles.primaryActionButton}><Ionicons color="#FFFFFF" name="calendar-outline" size={18} /><Text style={styles.primaryActionText}>Book Appointment</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => router.push("/quick-sale")} style={styles.primaryOutlineButton}><Text style={styles.primaryOutlineButtonText}>Quick Sale</Text></TouchableOpacity>
            </View>
          </View>
        ) : null}

        {activeTab === "notes" ? <View style={styles.tabContent}><Text style={styles.contentHeading}>Notes</Text><View style={styles.notesPanel}><Ionicons color={Colors.primary} name="document-text-outline" size={22} /><Text style={styles.notesText}>{client.notes}</Text></View></View> : null}
      </ScrollView>
      <MembershipPickerModal memberships={memberships} onClose={() => setPickerVisible(false)} onSelect={(membership) => void handleSelectMembership(membership)} saving={membershipMutating} visible={pickerVisible} />
    </SafeAreaView>
  );
}
const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  headerIconButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  headerTitleGroup: { alignItems: "center", flexDirection: "row", gap: 9 },
  headerAvatar: { alignItems: "center", backgroundColor: "#6B6B6B", borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  clientHero: { backgroundColor: "#FCF7FB", marginHorizontal: -AppLayout.contentHorizontalPadding, paddingHorizontal: 22, paddingBottom: 25, paddingTop: 20 },
  clientIdentityRow: { alignItems: "center", flexDirection: "row", gap: 14, marginBottom: 22 },
  profileAvatar: { alignItems: "center", backgroundColor: "#050505", borderRadius: 38, height: 76, justifyContent: "center", width: 76 },
  contactRow: { alignItems: "center", flexDirection: "row", gap: 10, marginBottom: 15 },
  contactText: { color: Colors.heading, flexShrink: 1, fontSize: 17 },
  walletRow: { alignItems: "center", flexDirection: "row", gap: 16, marginTop: 4 },
  walletPill: { alignItems: "center", backgroundColor: Colors.primary, borderRadius: 30, flexDirection: "row", gap: 8, minWidth: 130, paddingHorizontal: 24, paddingVertical: 14 },
  walletValue: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  addMoneyButton: { alignItems: "center", flexDirection: "row", gap: 5, paddingVertical: 12 },
  addMoneyText: { color: Colors.heading, fontSize: 16, fontWeight: "700" },
  tabsRow: { alignItems: "stretch", flexDirection: "row", marginHorizontal: -AppLayout.contentHorizontalPadding, paddingLeft: 6 },
  tabButton: { alignItems: "center", borderBottomColor: "transparent", borderBottomWidth: 3, flex: 1, justifyContent: "center", minHeight: 54, paddingHorizontal: 3 },
  tabButtonActive: { borderBottomColor: Colors.primary },
  tabText: { color: Colors.heading, fontSize: 14 },
  tabTextActive: { color: Colors.primary, fontWeight: "800" },
  settingsButton: { alignItems: "center", justifyContent: "center", width: 46 },
  tabContent: { paddingTop: 22 },
  metricsGrid: { borderColor: Colors.border, borderRadius: 8, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", marginBottom: 28, overflow: "hidden" },
  metricCell: { borderBottomColor: Colors.border, borderBottomWidth: 1, borderRightColor: Colors.border, borderRightWidth: 1, minHeight: 112, padding: 12, width: "50%" },
  metricLabel: { color: Colors.text2, fontSize: 14, marginTop: 7 },
  metricValue: { color: Colors.heading, fontSize: 19, fontWeight: "700", marginTop: 7 },
  summarySection: { marginBottom: 28 },
  summarySectionTitle: { color: Colors.heading, fontSize: 19, fontWeight: "800", marginBottom: 14 },
  emptySummaryBox: { alignItems: "center", backgroundColor: "#FAFAFA", borderRadius: 8, height: 168, justifyContent: "center" },
  emptySummaryIcon: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 38, height: 76, justifyContent: "center", width: 76 },
  emptySummaryText: { color: Colors.text2, fontSize: 17, marginTop: 13 },
  clientMetaRow: { alignItems: "center", backgroundColor: "#FCF7FB", flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingVertical: 14 },
  clientMetaLabel: { color: Colors.text2, fontSize: 14 },
  clientMetaValue: { color: Colors.heading, flex: 1, fontSize: 15, fontWeight: "700" },
  latestServiceRow: { alignItems: "center", backgroundColor: "#FCF7FB", flexDirection: "row", gap: 8, marginTop: 12, paddingHorizontal: 14, paddingVertical: 14 },
  latestServiceValue: { color: Colors.heading, flex: 1, fontSize: 15, fontWeight: "700" },
  contentHeading: { color: Colors.heading, fontSize: 19, fontWeight: "800", marginBottom: 14 },
  loader: { marginVertical: 18 },
  activityRow: { alignItems: "center", borderBottomColor: Colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 12, paddingVertical: 14 },
  activityIcon: { alignItems: "center", backgroundColor: "#FCF7FB", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  activityCopy: { flex: 1 },
  activityTitle: { color: Colors.heading, fontSize: 15, fontWeight: "700" },
  activityMeta: { color: Colors.text2, fontSize: 12, marginTop: 4 },
  activityAmount: { color: Colors.heading, fontSize: 14, fontWeight: "700" },
  profileDetails: { borderColor: Colors.border, borderRadius: 8, borderWidth: 1, marginBottom: 24, padding: 16 },
  membershipProfileTitle: { color: Colors.heading, fontSize: 16, fontWeight: "700" },
  membershipProfileMeta: { color: Colors.text2, fontSize: 13, marginTop: 5 },
  profileActions: { gap: 12 },
  primaryActionButton: { alignItems: "center", backgroundColor: Colors.primary, borderRadius: 8, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 50, paddingHorizontal: 18 },
  primaryActionText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  primaryOutlineButton: { alignItems: "center", borderColor: Colors.primary, borderRadius: 8, borderWidth: 1, justifyContent: "center", marginTop: 14, minHeight: 48, paddingHorizontal: 16 },
  primaryOutlineButtonText: { color: Colors.primary, fontSize: 14, fontWeight: "700" },
  notesPanel: { alignItems: "flex-start", backgroundColor: "#FCF7FB", borderRadius: 8, flexDirection: "row", gap: 12, minHeight: 120, padding: 18 },
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  content: {
    paddingBottom: AppLayout.contentBottomPadding,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: AppLayout.headerMarginBottom,
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
  headerAction: {
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
  heroCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    padding: AppLayout.cardPadding + Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 34,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
  },
  clientName: {
    color: Colors.heading,
    fontSize: 22,
    fontWeight: "800",
    marginTop: Spacing.md,
  },
  clientPhone: {
    color: Colors.text2,
    fontSize: 13,
    marginTop: 4,
  },
  membershipBadge: {
    alignItems: "center",
    backgroundColor: Colors.warningBg,
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 4,
    marginTop: Spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  membershipText: {
    color: Colors.goldDark,
    fontSize: 11,
    fontWeight: "700",
  },
  statsGrid: {
    width: "100%",
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statCard: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  statValue: {
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "800",
  },
  statLabel: {
    color: Colors.text2,
    fontSize: 11,
    marginTop: 4,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    marginTop: Spacing.md,
  },
  quickAction: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    paddingVertical: 14,
  },
  quickActionBlocked: {
    borderColor: Colors.success,
    backgroundColor: Colors.successBg,
  },
  quickActionText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: "700",
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: Spacing.md,
  },
  detailRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  detailLabel: {
    color: Colors.text2,
    fontSize: 13,
  },
  detailValue: {
    color: Colors.heading,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: Spacing.md,
    textAlign: "right",
  },
  notesText: {
    color: Colors.text,
    fontSize: 13,
    lineHeight: 20,
  },
  notFoundWrap: {
    flex: 1,
    padding: Spacing.lg,
  },
  notFoundCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  notFoundTitle: {
    color: Colors.heading,
    fontSize: 20,
    fontWeight: "800",
  },
  notFoundSubtitle: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    textAlign: "center",
    marginVertical: 12,
  },
  historyCard: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  historyTypeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  historyTypeText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.primaryDark,
  },
  historyDate: {
    fontSize: 11,
    color: Colors.text2,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.heading,
  },
  historyDesc: {
    fontSize: 12,
    color: Colors.text,
    marginTop: 4,
  },
  historyItemsList: {
    marginTop: Spacing.xs,
    paddingLeft: Spacing.xs,
  },
  historySubItem: {
    fontSize: 12,
    color: Colors.text2,
    marginTop: 2,
  },
  historyFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopColor: Colors.border,
    borderTopWidth: 0.5,
  },
  historyStaff: {
    fontSize: 11,
    color: Colors.text2,
  },
  historyAmount: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.heading,
  },
  assignMembershipButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 8,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
  },
  assignMembershipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  assignmentStatusBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  assignmentStatusText: {
    fontSize: 10,
    fontWeight: "900",
  },
  benefitList: {
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  benefitName: {
    color: Colors.heading,
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
  },
  benefitRemaining: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  benefitRow: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "space-between",
    padding: Spacing.sm,
  },
  emptyMembershipCard: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  membershipAction: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    flex: 1,
    paddingVertical: 11,
  },
  membershipActionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  membershipActionText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  membershipDangerAction: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.full,
    flex: 1,
    paddingVertical: 11,
  },
  membershipDangerActionText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "900",
  },
  membershipHistoryCopy: {
    flex: 1,
  },
  membershipHistoryDot: {
    backgroundColor: Colors.primary,
    borderRadius: 5,
    height: 10,
    marginTop: 4,
    width: 10,
  },
  membershipHistoryMeta: {
    color: Colors.text2,
    fontSize: 12,
    marginTop: 2,
  },
  membershipHistoryRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingVertical: 9,
  },
  membershipHistoryTitle: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "900",
  },
  membershipOption: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    minHeight: 64,
    paddingVertical: Spacing.sm,
  },
  membershipOptionCopy: {
    flex: 1,
    minWidth: 0,
  },
  membershipOptionIcon: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  membershipOptionMeta: {
    color: Colors.text2,
    fontSize: 12,
    marginTop: 3,
  },
  membershipOptionTitle: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "900",
  },
  membershipStatBox: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    flex: 1,
    padding: Spacing.md,
  },
  membershipStatLabel: {
    color: Colors.text2,
    fontSize: 11,
    marginTop: 4,
  },
  membershipStatValue: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "900",
  },
  membershipStatsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  membershipSummaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  membershipSummaryIcon: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  membershipSummaryMeta: {
    color: Colors.text2,
    fontSize: 12,
    marginTop: 3,
  },
  membershipSummaryTitle: {
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "900",
  },
  membershipSummaryTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalOverlay: {
    backgroundColor: "rgba(0,0,0,0.36)",
    flex: 1,
    justifyContent: "flex-end",
  },
  pickerClose: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  pickerHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  pickerList: {
    maxHeight: 420,
  },
  pickerSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
  },
  pickerTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "900",
  },
});
