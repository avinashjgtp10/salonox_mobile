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
  blockClientThunk,
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
                Alert.alert("Success", "Client unblocked successfully.");
              } else {
                Alert.alert("Error", "Unable to unblock client.");
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
                void dispatch(fetchClientByIdThunk(client.id));
                Alert.alert("Success", "Client blocked successfully.");
              } else {
                Alert.alert("Error", "Unable to block client.");
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
              <Ionicons name="chevron-back" size={18} color={Colors.primary} />
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
              <Ionicons name="chevron-back" size={18} color={Colors.primary} />
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
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
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

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity activeOpacity={0.8} hitSlop={AppLayout.headerActionHitSlop} onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Client Profile</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            hitSlop={AppLayout.headerActionHitSlop}
            onPress={() => router.push("/bookings/new")}
            style={styles.headerAction}
          >
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View style={[styles.avatar, { backgroundColor: client.avatarBg }]}>
            <Text style={[styles.avatarText, { color: client.avatarColor }]}>
              {client.initials}
            </Text>
          </View>
          <Text style={styles.clientName}>{client.fullName}</Text>
          <Text style={styles.clientPhone}>{client.phone}</Text>
          {client.membership ? (
            <View style={styles.membershipBadge}>
              <Ionicons name="diamond-outline" size={12} color={Colors.goldDark} />
              <Text style={styles.membershipText}>{client.membership}</Text>
            </View>
          ) : null}

          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {formatCurrency(clientStats?.lifetimeSpend ?? 0)}
                </Text>
                <Text style={styles.statLabel}>Lifetime Spend</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {clientStats?.totalVisits ?? client.totalVisits}
                </Text>
                <Text style={styles.statLabel}>Total Visits</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {formatCurrency(clientStats?.averageSpend ?? 0)}
                </Text>
                <Text style={styles.statLabel}>Avg Spend</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {clientStats?.lastVisit ? formatCreatedDate(clientStats.lastVisit) : "-"}
                </Text>
                <Text style={styles.statLabel}>Last Visit</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/bookings/new")}
            style={styles.quickAction}
          >
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.quickActionText}>Book</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/quick-sale")}
            style={styles.quickAction}
          >
            <Ionicons name="flash-outline" size={18} color={Colors.primary} />
            <Text style={styles.quickActionText}>Quick Sale</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push(`/clients/${client.id}/edit` as Href)}
            style={styles.quickAction}
          >
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
            <Text style={styles.quickActionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isBlocking}
            onPress={handleBlockToggle}
            style={[styles.quickAction, client.isBlocked && styles.quickActionBlocked]}
          >
            {isBlocking ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons
                name={client.isBlocked ? "lock-open-outline" : "ban-outline"}
                size={18}
                color={client.isBlocked ? Colors.success : Colors.error}
              />
            )}
            <Text style={[styles.quickActionText, client.isBlocked && { color: Colors.success }]}>
              {client.isBlocked ? "Unblock" : "Block"}
            </Text>
          </TouchableOpacity>
        </View>

        <Section title="Membership">
          {membershipLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />
          ) : membershipError ? (
            <Text style={styles.errorText}>{membershipError}</Text>
          ) : activeMembership ? (
            <>
              <View style={styles.membershipSummaryTop}>
                <View style={styles.membershipSummaryIcon}>
                  <Ionicons name="diamond-outline" size={22} color={Colors.primary} />
                </View>
                <View style={styles.membershipSummaryCopy}>
                  <Text numberOfLines={1} style={styles.membershipSummaryTitle}>
                    {activeMembership.membershipName}
                  </Text>
                  <Text style={styles.membershipSummaryMeta}>
                    Expires {formatCreatedDate(activeMembership.expiresAt)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.assignmentStatusBadge,
                    { backgroundColor: getMembershipStatusTone(activeMembership.status, Colors).bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.assignmentStatusText,
                      { color: getMembershipStatusTone(activeMembership.status, Colors).color },
                    ]}
                  >
                    {formatStatusLabel(activeMembership.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.membershipStatsRow}>
                <View style={styles.membershipStatBox}>
                  <Text style={styles.membershipStatValue}>
                    {activeMembership.remainingBenefits ?? "-"}
                  </Text>
                  <Text style={styles.membershipStatLabel}>Remaining Benefits</Text>
                </View>
                <View style={styles.membershipStatBox}>
                  <Text style={styles.membershipStatValue}>{formatCreatedDate(activeMembership.startsAt)}</Text>
                  <Text style={styles.membershipStatLabel}>Start Date</Text>
                </View>
              </View>

              {activeMembership.benefits.length > 0 ? (
                <View style={styles.benefitList}>
                  {activeMembership.benefits.map((benefit) => (
                    <View key={`${benefit.serviceId}-${benefit.serviceName}`} style={styles.benefitRow}>
                      <Text numberOfLines={1} style={styles.benefitName}>{benefit.serviceName}</Text>
                      <Text style={styles.benefitRemaining}>
                        {benefit.remaining ?? "-"} left
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.membershipActionRow}>
                <TouchableOpacity disabled={membershipMutating} onPress={() => setPickerVisible(true)} style={styles.membershipAction}>
                  <Text style={styles.membershipActionText}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={membershipMutating} onPress={() => void handleRenewMembership()} style={styles.membershipAction}>
                  <Text style={styles.membershipActionText}>Renew</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={membershipMutating} onPress={handleCancelMembership} style={styles.membershipDangerAction}>
                  <Text style={styles.membershipDangerActionText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.emptyMembershipCard}>
              <Text style={styles.notesText}>No active membership assigned.</Text>
              <TouchableOpacity disabled={membershipMutating} onPress={() => setPickerVisible(true)} style={styles.assignMembershipButton}>
                <Ionicons name="person-add-outline" size={16} color="#FFFFFF" />
                <Text style={styles.assignMembershipText}>Assign Membership</Text>
              </TouchableOpacity>
            </View>
          )}

          {membershipMutating ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} /> : null}
          {membershipMutationError ? <Text style={styles.errorText}>{membershipMutationError}</Text> : null}
        </Section>

        <Section title="Membership History">
          {clientMemberships.length === 0 ? (
            <Text style={styles.notesText}>No membership history found.</Text>
          ) : (
            clientMemberships.map((assignment) => (
              <View key={assignment.id} style={styles.membershipHistoryRow}>
                <View style={styles.membershipHistoryDot} />
                <View style={styles.membershipHistoryCopy}>
                  <Text style={styles.membershipHistoryTitle}>{assignment.membershipName}</Text>
                  <Text style={styles.membershipHistoryMeta}>
                    {formatStatusLabel(assignment.status)} - Expires {formatCreatedDate(assignment.expiresAt)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Section>

        <Section title="Client Information">
          <DetailRow label="Email" value={client.email} />
          <DetailRow label="Gender" value={client.gender} />
          <DetailRow label="Membership" value={client.membership ?? "-"} />
          <DetailRow label="Status" value={client.status} />
          <DetailRow label="Favorite Service" value={client.favoriteService} />
          <DetailRow label="Preferred Staff" value={client.preferredStaff} />
          <DetailRow label="City" value={client.city} />
          <DetailRow label="Created" value={client.createdLabel} />
        </Section>

        <Section title="Timeline & History">
          {historyLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 12 }} />
          ) : historyError ? (
            <Text style={styles.errorText}>{historyError}</Text>
          ) : !history || history.length === 0 ? (
            <Text style={styles.notesText}>No history records found.</Text>
          ) : (
            history.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyTypeTag}>
                    <Ionicons
                      name={
                        item.type === "appointment"
                          ? "calendar"
                          : item.type === "sale"
                          ? "cash"
                          : "time"
                      }
                      size={12}
                      color={Colors.primary}
                    />
                    <Text style={styles.historyTypeText}>{item.type.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.historyDate}>{item.dateLabel}</Text>
                </View>
                <Text style={styles.historyTitle}>{item.title}</Text>
                {item.description ? <Text style={styles.historyDesc}>{item.description}</Text> : null}
                {item.items && item.items.length > 0 ? (
                  <View style={styles.historyItemsList}>
                    {item.items.map((sub, idx) => (
                      <Text key={idx} style={styles.historySubItem}>
                        • {sub.name} ({sub.type}) - {formatCurrency(sub.price)}
                      </Text>
                    ))}
                  </View>
                ) : null}
                <View style={styles.historyFooter}>
                  {item.staffName ? (
                    <Text style={styles.historyStaff}>Staff: {item.staffName}</Text>
                  ) : null}
                  {item.amount > 0 ? (
                    <Text style={styles.historyAmount}>{formatCurrency(item.amount)}</Text>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </Section>

        <Section title="Notes">
          <Text style={styles.notesText}>{client.notes}</Text>
        </Section>
      </ScrollView>
      <MembershipPickerModal
        memberships={memberships}
        onClose={() => setPickerVisible(false)}
        onSelect={(membership) => void handleSelectMembership(membership)}
        saving={membershipMutating}
        visible={pickerVisible}
      />
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
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
