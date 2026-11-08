import { selectCurrentUser } from "@/store/user/user.slice";
import { getUserFullName } from "@/utils/userProfile";
import { clientBirthdayLabel } from "../utils/clientBirthday";
import { ClientBottomNav } from "../components/ClientBottomNav";
import { LunoxSheet } from "@/components/lunox/LunoxSheet";
import { Clipboard, Image, Linking , ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ClientEntrySheets } from "../components/ClientEntrySheets";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl, pearlTones } from "@/components/auth/pearl/tokens";
import { LinearGradient } from "expo-linear-gradient";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ClientButton, ClientMenuRow, clientUi } from "../components/ClientPearl";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { maskPhone } from "@/utils/maskPhone";
import { Text } from "@/components/ui/AppTypography";
import { appAlert as Alert } from "@/services/appAlert";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import { addRealtimeEntityChangedListener } from "@/services/realtimeEvents";
import { clientService } from "@/services/client.service";
import { fetchClientMembershipsThunk } from "@/middleware/clientMembership/clientMembership.thunk";
import {
  fetchClientByIdThunk,
  fetchClientHistoryThunk,
  fetchClientNotesThunk,
  blockClientThunk,
  unblockClientThunk,
} from "@/middleware/client/client.thunk";
import {
  selectClientById,
  selectClientDetailsError,
  selectClientDetailsLoading,
  selectClientHistory,
  selectClientHistoryAppointments,
  selectClientHistoryClient,
  selectClientHistoryLoading,
  selectClientHistoryError,
  selectClientHistoryMemberships,
  selectClientHistoryPackages,
  selectClientHistorySales,
  selectClientNotes,
  selectClientNotesError,
  selectClientNotesLoading,
  selectClientProfileStats,
  selectClientBlockingIds,
} from "@/store/client/client.slice";
import { useAppToast } from "@/hooks/useAppToast";
import {
  selectActiveClientMembership,
  selectClientMembershipsError,
  selectClientMembershipsLoading,
} from "@/store/clientMembership/clientMembership.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import { usePearlColors, type PearlColors as ThemeColors } from "@/components/auth/pearl/usePearlColors";
import { formatAppDate } from "@/utils/dateTime";
import { buildClientProfileMetrics } from "@/features/clients/utils/clientProfile";
import type { ClientProfileLineEntry } from "@/features/clients/utils/clientProfile";
import type { ClientMembershipRecord, ClientPackageRecord } from "@/types/client";
import { formatCurrency } from "@/utils/currency";

function formatCreatedDate(createdAt: string | null) {
  return formatAppDate(createdAt, "-");
}

function formatOptionalCurrency(amount: number | null) {
  return amount === null ? "–" : formatCurrency(amount);
}

function titleCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "-";
}

function DetailRow({ label, value, onCopy }: { label: string; value: string; onCopy?: () => void }) {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailValueGroup}>
        <Text style={styles.detailValue}>{value}</Text>
        {onCopy ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Copy referral code" onPress={onCopy} hitSlop={8} style={styles.copyButton}><Ionicons name="copy-outline" size={17} color={pearl.accentDeep} /></TouchableOpacity> : null}
      </View>
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
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.summarySection}>
      {title ? <Text style={styles.summarySectionTitle}>{title}</Text> : null}
      <View style={styles.emptySummaryBox}>
        <View style={styles.emptySummaryIcon}>
          <Ionicons color={Colors.text2} name={icon} size={28} />
        </View>
        <Text style={styles.emptySummaryText}>{label}</Text>
      </View>
    </View>
  );
}

const SECTION_ROW_LIMIT = 5;

function SummarySection({
  children,
  count,
  title,
}: {
  children: React.ReactNode;
  count?: number;
  title: string;
}) {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.summarySection}>
      <View style={styles.summarySectionHeader}>
        <Text style={styles.summarySectionTitle}>{title}</Text>
        {typeof count === "number" && count > 0 ? (
          <Text style={styles.summarySectionCount}>{count}</Text>
        ) : null}
      </View>
      <View style={styles.summaryList}>{children}</View>
    </View>
  );
}

function MoreRow({ remaining }: { remaining: number }) {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  if (remaining <= 0) {
    return null;
  }

  return <Text style={styles.summaryMoreText}>+{remaining} more</Text>;
}

function LineEntryRow({ entry }: { entry: ClientProfileLineEntry }) {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const meta = [
    formatCreatedDate(entry.date),
    entry.quantity > 1 ? `Qty ${entry.quantity} × ${formatCurrency(entry.unitPrice)}` : null,
    entry.invoiceNumber ? `Inv ${entry.invoiceNumber}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryRowCopy}>
        <Text numberOfLines={1} style={styles.summaryRowTitle}>{entry.name || "-"}</Text>
        <Text numberOfLines={1} style={styles.summaryRowMeta}>{meta}</Text>
        {entry.discountAmount !== null || entry.taxAmount !== null ? (
          <Text numberOfLines={1} style={styles.summaryRowMeta}>
            Discount {formatOptionalCurrency(entry.discountAmount)} · Tax{" "}
            {formatOptionalCurrency(entry.taxAmount)}
          </Text>
        ) : null}
      </View>
      <Text style={styles.summaryRowAmount}>{formatCurrency(entry.totalPrice)}</Text>
    </View>
  );
}

function MembershipRow({ membership }: { membership: ClientMembershipRecord }) {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const meta = [
    `Purchased ${formatCreatedDate(membership.purchasedAt)}`,
    membership.expiresAt ? `Expires ${formatCreatedDate(membership.expiresAt)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const sessions =
    membership.totalSessions > 0
      ? `${membership.usedSessions}/${membership.totalSessions} sessions used · ${membership.remainingSessions} left`
      : null;

  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryRowCopy}>
        <Text numberOfLines={1} style={styles.summaryRowTitle}>{membership.membershipName}</Text>
        <Text numberOfLines={1} style={styles.summaryRowMeta}>{meta}</Text>
        {sessions ? <Text numberOfLines={1} style={styles.summaryRowMeta}>{sessions}</Text> : null}
        {membership.membershipWalletBalance > 0 ? (
          <Text numberOfLines={1} style={styles.summaryRowMeta}>
            Wallet {formatCurrency(membership.membershipWalletBalance)}
          </Text>
        ) : null}
      </View>
      <View style={styles.summaryRowTrailing}>
        <Text style={styles.summaryRowAmount}>{formatCurrency(membership.pricePaid)}</Text>
        <Text style={styles.summaryRowStatus}>{titleCase(membership.status)}</Text>
      </View>
    </View>
  );
}

function PackageRow({ pkg }: { pkg: ClientPackageRecord }) {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const meta = [
    `Created ${formatCreatedDate(pkg.createdDate)}`,
    pkg.expiryDate ? `Expires ${formatCreatedDate(pkg.expiryDate)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const sessions =
    pkg.totalSessions > 0
      ? `${pkg.completedSessions}/${pkg.totalSessions} sessions used · ${pkg.remainingSessions} left`
      : null;

  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryRowCopy}>
        <Text numberOfLines={1} style={styles.summaryRowTitle}>{pkg.packageName}</Text>
        <Text numberOfLines={1} style={styles.summaryRowMeta}>{meta}</Text>
        {sessions ? <Text numberOfLines={1} style={styles.summaryRowMeta}>{sessions}</Text> : null}
        {pkg.pendingAmount > 0 ? (
          <Text numberOfLines={1} style={styles.summaryRowMeta}>
            Pending {formatCurrency(pkg.pendingAmount)}
          </Text>
        ) : null}
      </View>
      <View style={styles.summaryRowTrailing}>
        <Text style={styles.summaryRowAmount}>{formatCurrency(pkg.totalAmount)}</Text>
        <Text style={styles.summaryRowStatus}>{titleCase(pkg.status)}</Text>
      </View>
    </View>
  );
}

export default function ClientDetailsScreen() {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const dispatch = useAppDispatch();
  const toast = useAppToast();
  const author = getUserFullName(useAppSelector(selectCurrentUser));

  const liveClient = useAppSelector((state) => selectClientById(state, id));
  const detailsLoading = useAppSelector(selectClientDetailsLoading);
  const detailsError = useAppSelector(selectClientDetailsError);

  const rawHistory = useAppSelector(selectClientHistory);
  const history = useMemo(() => (Array.isArray(rawHistory) ? rawHistory : []), [rawHistory]);
  const historyLoading = useAppSelector(selectClientHistoryLoading);
  const historyError = useAppSelector(selectClientHistoryError);

  const historyClient = useAppSelector(selectClientHistoryClient);
  const profileStats = useAppSelector(selectClientProfileStats);
  const historyAppointments = useAppSelector(selectClientHistoryAppointments);
  const historySales = useAppSelector(selectClientHistorySales);
  const historyPackages = useAppSelector(selectClientHistoryPackages);
  const historyMemberships = useAppSelector(selectClientHistoryMemberships);

  const notes = useAppSelector(selectClientNotes(id));
  const notesLoading = useAppSelector(selectClientNotesLoading);
  const notesError = useAppSelector(selectClientNotesError);

  const blockingIds = useAppSelector(selectClientBlockingIds);
  const activeMembership = useAppSelector(selectActiveClientMembership(id));
  const membershipLoading = useAppSelector(selectClientMembershipsLoading(id));
  const membershipError = useAppSelector(selectClientMembershipsError(id));

  const metrics = useMemo(
    () =>
      buildClientProfileMetrics({
        stats: profileStats,
        appointments: historyAppointments,
        sales: historySales,
        packages: historyPackages,
        memberships: historyMemberships,
      }),
    [profileStats, historyAppointments, historySales, historyPackages, historyMemberships],
  );

  const isBlocking = id ? blockingIds.includes(id) : false;
  const [lunoxVisible, setLunoxVisible] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [entryKind, setEntryKind] = useState<"wallet" | "note" | null>(null);
  const [expandedSummary, setExpandedSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<ClientTab>("summary");

  useEffect(() => {
    if (id && activeTab === "notes" && notes === null && !notesLoading) {
      void dispatch(fetchClientNotesThunk(id));
    }
  }, [activeTab, dispatch, id, notes, notesLoading]);

  useEffect(() => {
    if (id) {
      void dispatch(fetchClientHistoryThunk(id));
      void dispatch(fetchClientMembershipsThunk(id));
    }
  }, [id, dispatch]);

  useFocusEffect(useCallback(() => {
    if (id) void dispatch(fetchClientByIdThunk(id));
  }, [dispatch, id]));

  useEffect(
    () =>
      addRealtimeEntityChangedListener(({ entity }) => {
        if (id && (entity === "clientMemberships" || entity === "memberships" || entity === "clients")) {
          void dispatch(fetchClientByIdThunk(id));
          void dispatch(fetchClientMembershipsThunk(id));
          void dispatch(fetchClientHistoryThunk(id));
        }
      }),
    [dispatch, id],
  );

  const client = useMemo(() => {
    if (!liveClient) {
      return null;
    }

    const avatarTone = clientService.getAvatarTone(liveClient.id);

    return {
      avatarBg: avatarTone.background,
      avatarColor: avatarTone.color,
      createdLabel: historyClient?.createdAt
        ? formatCreatedDate(historyClient.createdAt)
        : liveClient.createdDateLabel,
      email: historyClient?.email || liveClient.email,
      fullName: liveClient.fullName,
      gender: historyClient?.gender || liveClient.gender,
      id: liveClient.id,
      initials: liveClient.initials,
      membership: liveClient.membership,
      phone: historyClient?.phoneNumber || liveClient.phone,
      referredBy: historyClient?.referredBy?.fullName ?? null,
      clientSource: historyClient?.clientSource ?? null,
      referralCode: historyClient?.referralCode ?? null,
      walletBalance: historyClient?.walletBalance ?? 0,
      rewardPointsBalance: historyClient?.rewardPointsBalance ?? 0,
      referralBalance: historyClient?.referralBalance ?? 0,
      status: liveClient.status,
      isBlocked: liveClient.isBlocked,
      totalVisits: liveClient.totalVisits,
    };
  }, [historyClient, liveClient]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/clients" as Href);
  };

  const handleBlockToggle = () => {
    if (!client || isBlocking) return;

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
                blockClientThunk({ clientId: client.id, reason: "Blocked by staff action" })
              );
              if (blockClientThunk.fulfilled.match(res)) {
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

  if (detailsLoading) {
    return (
      <PearlBackground><SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.notFoundWrap}>
          <View style={styles.headerRow}>
            <AppBackButton activeOpacity={0.8} hitSlop={AppLayout.headerActionHitSlop} onPress={handleBack} />
            <Text style={styles.headerTitle}>Client Profile</Text>
            <View style={styles.backButtonPlaceholder} />
          </View>
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color={Colors.primaryText} />
          </View>
        </View>
      </SafeAreaView></PearlBackground>
    );
  }

  if (detailsError) {
    return (
      <PearlBackground><SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.notFoundWrap}>
          <View style={styles.headerRow}>
            <AppBackButton activeOpacity={0.8} hitSlop={AppLayout.headerActionHitSlop} onPress={handleBack} />
            <Text style={styles.headerTitle}>Client Profile</Text>
            <View style={styles.backButtonPlaceholder} />
          </View>
          <View style={styles.notFoundCard}>
            <Text style={styles.notFoundTitle}>Unable to load client</Text>
            <Text style={styles.notFoundSubtitle}>{detailsError}</Text>
          </View>
        </View>
      </SafeAreaView></PearlBackground>
    );
  }

  if (!client) {
    return (
      <PearlBackground><SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.notFoundWrap}>
          <AppBackButton activeOpacity={0.8} hitSlop={AppLayout.headerActionHitSlop} onPress={handleBack} />
          <View style={styles.notFoundCard}>
            <Text style={styles.notFoundTitle}>Client not found</Text>
            <Text style={styles.notFoundSubtitle}>
              This client profile could not be found.
            </Text>
          </View>
        </View>
      </SafeAreaView></PearlBackground>
    );
  }

  const editClient = () => router.push(("/clients/" + client.id + "/edit") as Href);
  const phone = client.phone.startsWith("+") ? client.phone : (liveClient?.phoneCountryCode ?? "+91") + client.phone;
  return <PearlBackground><SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}><AppStatusBar />
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
      <View style={detailUi.header}><AppBackButton onPress={handleBack} /><Text style={detailUi.title}>Client</Text><TouchableOpacity accessibilityLabel="More actions" onPress={() => setActionsVisible(true)} style={detailUi.iconButton}><Ionicons name="ellipsis-horizontal" size={20} color={pearl.ink} /></TouchableOpacity></View>
      <View style={detailUi.hero}>
        <View style={detailUi.identity}><LinearGradient colors={pearlTones.rose.avatar} style={detailUi.avatar}><Text style={{ fontSize: 22, fontWeight: "700", color: "#FFFFFF" }}>{client.initials}</Text></LinearGradient><View style={{ flex: 1 }}><Text style={detailUi.name}>{client.fullName}</Text>{client.membership ? <Text style={{ color: "#94640F", fontSize: 11 }}>{client.membership}</Text> : null}<Text style={clientUi.muted}>{maskPhone(client.phone)}</Text><Text style={clientUi.muted}>{client.email || "Not added"}</Text></View></View>
        <View style={detailUi.wallet}><View><Text style={clientUi.muted}>Wallet balance</Text><Text style={detailUi.balance}>{formatCurrency(client.walletBalance)}</Text></View><ClientButton secondary label="+ Add money" onPress={() => setEntryKind("wallet")} /></View>
        <View style={{ flexDirection: "row" }}>{([
          { label: "Call", icon: "call-outline", action: () => { void Linking.openURL("tel:" + phone.replace(/[^+\d]/g, "")).catch(() => toast.showError("Calling is unavailable.")); } },
          { label: "WhatsApp", icon: "logo-whatsapp", action: () => router.push(("/inbox/" + phone.replace(/\D/g, "")) as Href) },
          { label: "Book", icon: "calendar-outline", action: () => router.push({ pathname: "/bookings/new", params: { clientId: client.id } } as Href) },
          { label: "Sale", icon: "flash-outline", action: () => router.push({ pathname: "/quick-sale", params: { clientId: client.id } } as Href) },
        ] as const).map((action) => <TouchableOpacity key={action.label} onPress={action.action} style={detailUi.quickAction}><View style={detailUi.actionCircle}><Ionicons name={action.icon} size={20} color={pearl.accentDeep} /></View><Text style={{ color: pearl.ink2, fontSize: 11 }}>{action.label}</Text></TouchableOpacity>)}</View>
      </View>
      <TouchableOpacity onPress={() => setLunoxVisible(true)} style={detailUi.lunox}><Image source={require("../../../../assets/images/brand/lunox-mark.png")} style={{ width: 22, height: 22 }} resizeMode="contain" /><Text style={{ flex: 1, fontSize: 12, color: pearl.accentDeep }}>Ask Lunox: summarise {client.fullName.split(" ")[0]}’s visits</Text></TouchableOpacity>
      <View style={detailUi.tabs}>{CLIENT_TABS.map((tab) => <TouchableOpacity key={tab.key} accessibilityRole="tab" accessibilityState={{ selected: activeTab === tab.key }} onPress={() => setActiveTab(tab.key)} style={[detailUi.tab, activeTab === tab.key && { backgroundColor: pearl.glassStrong }]}><Text style={{ color: activeTab === tab.key ? pearl.ink : pearl.muted, fontSize: 12, fontWeight: "600" }}>{tab.label}</Text></TouchableOpacity>)}</View>
      {activeTab === "summary" ? <View style={{ gap: 14 }}><View style={detailUi.metrics}>{[
        ["Total visits", String(metrics.totalVisits)], ["Total spend", formatCurrency(metrics.totalSpend)], ["Amount due", metrics.amountDue === 0 ? "Nothing due" : formatCurrency(metrics.amountDue)], ["Reward points", String(client.rewardPointsBalance)], ["Favourite", [...metrics.services].sort((a, b) => b.quantity - a.quantity)[0]?.name ?? "None yet"], ["Products bought", metrics.products.length ? String(metrics.products.reduce((sum, item) => sum + item.quantity, 0)) : "None yet"],
      ].map(([label, value]) => <View key={label} style={detailUi.metric}><Text style={clientUi.muted}>{label}</Text><Text style={[detailUi.metricValue, label === "Favourite" && { fontSize: 15 }, label === "Amount due" && metrics.amountDue === 0 && { color: pearl.successText }]}>{value}</Text></View>)}</View>
        <ClientButton secondary label={expandedSummary ? "Less detail" : "More detail"} onPress={() => setExpandedSummary((value) => !value)} />
        {expandedSummary ? <><SummarySection title="Memberships" count={metrics.activeMemberships.length + metrics.pastMemberships.length}>{[...metrics.activeMemberships, ...metrics.pastMemberships].map((item) => <MembershipRow key={item.id} membership={item} />)}</SummarySection><SummarySection title="Packages" count={metrics.packages.length}>{metrics.packages.map((item) => <PackageRow key={item.id} pkg={item} />)}</SummarySection><SummarySection title="Services" count={metrics.services.length}>{metrics.services.slice(0, SECTION_ROW_LIMIT).map((entry) => <LineEntryRow key={entry.key} entry={entry} />)}<MoreRow remaining={metrics.services.length - SECTION_ROW_LIMIT} /></SummarySection><SummarySection title="Products" count={metrics.products.length}>{metrics.products.slice(0, SECTION_ROW_LIMIT).map((entry) => <LineEntryRow key={entry.key} entry={entry} />)}<MoreRow remaining={metrics.products.length - SECTION_ROW_LIMIT} /></SummarySection></> : null}
      </View> : null}
      {activeTab === "activity" ? <View style={clientUi.card}>{historyLoading ? <ActivityIndicator /> : null}{historyError ? <Text style={clientUi.error}>{historyError}</Text> : null}{!historyLoading && !history.length ? <EmptySummarySection title="" label="No activity yet" icon="time-outline" /> : null}{history.map((item) => <TouchableOpacity key={item.id} disabled={item.type !== "sale" && item.type !== "appointment"} onPress={() => router.push(((item.type === "sale" ? "/sales/" : "/appointments/") + item.id.replace(/^(sale|appointment)-/, "")) as Href)} style={clientUi.menuRow}><View style={clientUi.icon}><Ionicons name={item.type === "appointment" ? "calendar-outline" : "receipt-outline"} size={19} color={pearl.accentDeep} /></View><View style={{ flex: 1 }}><Text style={clientUi.rowTitle}>{item.title}</Text><Text style={clientUi.muted}>{[item.dateLabel, item.invoiceNumber, item.paymentMethod, item.staffName].filter(Boolean).join(" · ")}</Text></View>{item.amount > 0 ? <Text style={clientUi.rowTitle}>{formatCurrency(item.amount)}</Text> : null}</TouchableOpacity>)}</View> : null}
      {activeTab === "profile" ? <View style={{ gap: 14 }}><View style={[clientUi.card, styles.profileCard]}><DetailRow label="Gender" value={client.gender || "Not added"} /><DetailRow label="Birthday" value={liveClient?.birthdayDayMonth ? clientBirthdayLabel(liveClient.birthdayDayMonth) : "Not added"} /><DetailRow label="Anniversary" value={liveClient?.anniversary ? formatAppDate(liveClient.anniversary) : "Not added"} /><DetailRow label="Membership" value={activeMembership?.membershipName ?? client.membership ?? "None"} /><DetailRow label="Joined" value={client.createdLabel} /><DetailRow label="Source" value={client.clientSource ?? "Not added"} /><DetailRow label="Referred by" value={client.referredBy ?? "Not added"} /><DetailRow label="Referral code" value={client.referralCode || "Not added"} onCopy={client.referralCode ? () => { try { Clipboard.setString(client.referralCode!); toast.showSuccess("Referral code copied"); } catch { toast.showError("Unable to copy referral code."); } } : undefined} /><ClientButton secondary label="Edit profile" onPress={editClient} /></View>{membershipLoading ? <ActivityIndicator /> : null}{membershipError ? <Text style={clientUi.error}>{membershipError}</Text> : null}</View> : null}
      {activeTab === "notes" ? <View style={{ gap: 14 }}>{notesLoading ? <ActivityIndicator /> : null}{notesError ? <Text style={clientUi.error}>{notesError}</Text> : null}{notes !== null && (!notesLoading || notes.length > 0) ? <View style={clientUi.card}>{notes?.map((note) => <View key={note.id} style={clientUi.menuRow}><View style={clientUi.icon}><Ionicons name="document-text-outline" size={19} color={pearl.accentDeep} /></View><View style={{ flex: 1 }}><Text style={clientUi.rowTitle}>{note.note}</Text><Text style={clientUi.muted}>{[note.staffName, formatCreatedDate(note.createdAt)].filter(Boolean).join(" · ")}</Text></View></View>)}{!notesLoading && notes?.length === 0 ? <Text style={[clientUi.muted, { padding: 18 }]}>No notes yet.</Text> : null}</View> : null}<ClientButton secondary label="Add note" onPress={() => setEntryKind("note")} /></View> : null}
    </ScrollView>
    <ClientBottomNav />
    <BottomSheet pearlStyle centered={false} title={client.fullName} visible={actionsVisible} onClose={() => setActionsVisible(false)}><View style={{ gap: 16 }}><View style={clientUi.card}><ClientMenuRow icon="create-outline" title="Edit details" onPress={() => { setActionsVisible(false); editClient(); }} /><ClientMenuRow tone="peach" showChevron={false} icon="copy-outline" title="Merge duplicate" onPress={() => { setActionsVisible(false); router.push({ pathname: "/clients", params: { mergeFor: client.id } } as Href); }} /></View><Text style={clientUi.label}>Careful</Text><TouchableOpacity disabled={isBlocking} onPress={() => { setActionsVisible(false); handleBlockToggle(); }} style={detailUi.danger}><Ionicons name="ban-outline" size={18} color={pearl.dangerText} /><Text style={{ color: pearl.dangerText }}>{client.isBlocked ? "Unblock client" : "Block client"}</Text></TouchableOpacity></View></BottomSheet>
    <LunoxSheet visible={lunoxVisible} onClose={() => setLunoxVisible(false)} seed={"Summarise " + client.fullName + "'s visits"} />
    <ClientEntrySheets staffName={author} clientId={client.id} walletBalance={client.walletBalance} kind={entryKind} onClose={() => setEntryKind(null)} onSaved={(kind) => { toast.showSuccess(kind === "wallet" ? "Money added to wallet" : "Note saved"); void dispatch(fetchClientHistoryThunk(client.id)); if (kind === "note") { setActiveTab("notes"); void dispatch(fetchClientNotesThunk(client.id)); } }} />
  </SafeAreaView></PearlBackground>;
}
const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  summarySection: { marginBottom: 28 },
  summarySectionTitle: { color: Colors.heading, fontSize: 19, fontWeight: "800", marginBottom: 14 },
  summarySectionHeader: { alignItems: "center", flexDirection: "row", gap: 8 },
  summarySectionCount: { backgroundColor: Colors.backgroundElement, borderRadius: AppRadius.pill, color: Colors.primaryText, fontSize: 13, fontWeight: "800", marginBottom: 14, overflow: "hidden", paddingHorizontal: 9, paddingVertical: 2 },
  summaryList: { borderColor: Colors.border, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  summaryRow: { alignItems: "center", borderBottomColor: Colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  summaryRowCopy: { flex: 1, gap: 3 },
  summaryRowTitle: { color: Colors.heading, fontSize: 16, fontWeight: "700" },
  summaryRowMeta: { color: Colors.text2, fontSize: 13 },
  summaryRowTrailing: { alignItems: "flex-end", gap: 3 },
  summaryRowAmount: { color: Colors.heading, fontSize: 16, fontWeight: "700" },
  summaryRowStatus: { color: Colors.text2, fontSize: 12, fontWeight: "700" },
  summaryMoreText: { color: Colors.text2, fontSize: 13, fontWeight: "700", paddingHorizontal: 14, paddingVertical: 11 },
  emptySummaryBox: { alignItems: "center", backgroundColor: Colors.backgroundElement, borderRadius: 16, height: 168, justifyContent: "center" },
  emptySummaryIcon: { alignItems: "center", backgroundColor: Colors.card, borderRadius: 38, height: 76, justifyContent: "center", width: 76 },
  emptySummaryText: { color: Colors.text2, fontSize: 17, marginTop: 13 },
  safeArea: { flex: 1,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: AppLayout.headerMarginBottom,
  },
  backButtonPlaceholder: {
    width: AppLayout.headerActionSize,
  },
  headerTitle: {
    color: Colors.heading,
    fontSize: AppLayout.headerTitleFontSize,
    fontWeight: AppLayout.screenTitleFontWeight,
  },
  profileCard: { padding: 14, gap: 4 },
  detailValueGroup: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 },
  copyButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: pearl.accentWash, alignItems: "center", justifyContent: "center" },
  detailRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 40,
    paddingVertical: 8,
  },
  detailLabel: {
    width: "38%",
    color: Colors.text2,
    fontSize: 13,
  },
  detailValue: {
    color: Colors.heading,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
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
});

const detailUi = StyleSheet.create({ header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, title: { color: pearl.ink, fontSize: 18, fontWeight: "700" }, name: { color: pearl.ink, fontSize: 18, fontWeight: "700" }, iconButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder, justifyContent: "center", alignItems: "center" }, hero: { borderRadius: 28, backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder, padding: 16, gap: 16 }, identity: { flexDirection: "row", alignItems: "center", gap: 12 }, avatar: { width: 62, height: 62, borderRadius: 22, alignItems: "center", justifyContent: "center" }, wallet: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: pearl.divider }, balance: { color: pearl.ink, fontSize: 25, fontWeight: "800" }, quickAction: { flex: 1, alignItems: "center", gap: 6 }, actionCircle: { width: 40, height: 40, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: pearl.glass }, lunox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 13, borderRadius: 16, borderWidth: 1, borderColor: pearl.glassBorder, backgroundColor: pearl.glass }, tabs: { flexDirection: "row", borderRadius: 17, padding: 4, backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder }, tab: { flex: 1, minHeight: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" }, metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, metric: { flexBasis: "47%", flexGrow: 1, padding: 14, gap: 6, borderRadius: 22, backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder }, metricValue: { color: pearl.ink, fontSize: 21, fontWeight: "700" }, danger: { minHeight: 46, borderRadius: 16, borderWidth: 1, borderColor: pearl.dangerBorder, backgroundColor: pearl.dangerBg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 } });
