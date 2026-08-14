import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { addRealtimeEntityChangedListener } from "@/services/realtimeEvents";
import { assignClientMembershipThunk, fetchMembershipClientsThunk } from "@/middleware/clientMembership/clientMembership.thunk";
import { fetchClientsThunk } from "@/middleware/client/client.thunk";
import { deleteMembershipThunk, fetchMembershipByIdThunk } from "@/middleware/membership/membership.thunk";
import {
  selectClientMembershipMutating,
  selectMembershipClients,
  selectMembershipClientsError,
  selectMembershipClientsLoading,
} from "@/store/clientMembership/clientMembership.slice";
import { selectClients } from "@/store/client/client.slice";
import {
  selectDeletingMembershipIds,
  selectMembershipById,
  selectMembershipDetailsError,
  selectMembershipDetailsLoading,
} from "@/store/membership/membership.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ClientListItem } from "@/types/client";
import type { Membership } from "@/types/membership";
import { formatAppDate } from "@/utils/dateTime";

const formatMoney = (value: number) => `Rs. ${value.toLocaleString("en-IN")}`;
const formatDate = (value: string) => {
  return formatAppDate(value, "-");
};
const getStatus = (membership: Membership) => membership.enableOnlineSales || membership.enableOnlineRedemption ? "Active" : "Inactive";
const formatStatusLabel = (value: string) => value.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

type BenefitDisplay = {
  id: string;
  label: string;
  meta?: string;
};

type MembershipDisplay = {
  benefits: BenefitDisplay[];
  bonusCredit?: string;
  description: string;
};

const DESCRIPTION_FALLBACK = "No description available.";

const parseJsonLike = (value: unknown) => {
  if (typeof value !== "string") return value;

  const text = value.trim();
  if (!text || (!text.startsWith("{") && !text.startsWith("["))) return value;

  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (__DEV__) {
      console.warn("[MembershipDetails] Unable to parse membership metadata.", error);
    }

    return undefined;
  }
};

const toDisplayText = (value: unknown) => {
  if (typeof value === "string") {
    const text = value.trim();
    return text && parseJsonLike(text) === text ? text : undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  return undefined;
};

const humanizeKey = (value: string) =>
  value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const getReadableDescription = (value: unknown) => {
  const parsedValue = parseJsonLike(value);
  const plainText = toDisplayText(parsedValue);

  if (plainText) return plainText;

  if (isRecord(parsedValue)) {
    const description = toDisplayText(
      parsedValue.description ?? parsedValue.text ?? parsedValue.summary ?? parsedValue.details ?? parsedValue.about,
    );

    if (description) return description;
  }

  return DESCRIPTION_FALLBACK;
};

const isDisabledValue = (value: unknown) =>
  value === false ||
  value === null ||
  value === undefined ||
  value === 0 ||
  (typeof value === "string" && ["", "false", "no", "disabled", "inactive", "0"].includes(value.trim().toLowerCase()));

const isBonusCreditKey = (key: string) => {
  const normalizedKey = key.replace(/[_-\s]+/g, "").toLowerCase();
  return normalizedKey.includes("bonus") && normalizedKey.includes("credit");
};

const extractBenefitMeta = (value: unknown) => {
  if (!isRecord(value)) return undefined;

  return toDisplayText(value.description ?? value.detail ?? value.value ?? value.limit ?? value.count ?? value.amount);
};

const extractBenefitLabel = (key: string, value: unknown) => {
  if (isRecord(value)) {
    return toDisplayText(value.label ?? value.name ?? value.title ?? value.privilege ?? value.feature) ?? humanizeKey(key);
  }

  if (typeof value === "string" && value.trim() && !["true", "yes", "enabled", "1"].includes(value.trim().toLowerCase())) {
    return value.trim();
  }

  return humanizeKey(key);
};

const collectPrivilegeBenefits = (value: unknown, fallbackKey = "benefit"): BenefitDisplay[] => {
  const parsedValue = parseJsonLike(value);

  if (Array.isArray(parsedValue)) {
    return parsedValue.flatMap((item, index) => collectPrivilegeBenefits(item, `${fallbackKey}-${index + 1}`));
  }

  if (!isRecord(parsedValue)) {
    return isDisabledValue(parsedValue) ? [] : [{ id: fallbackKey, label: extractBenefitLabel(fallbackKey, parsedValue) }];
  }

  const nestedBenefits = parsedValue.privileges ?? parsedValue.benefits ?? parsedValue.features ?? parsedValue.includedBenefits;
  if (nestedBenefits !== undefined) {
    return collectPrivilegeBenefits(nestedBenefits, fallbackKey);
  }

  if (isDisabledValue(parsedValue.enabled ?? parsedValue.isEnabled ?? parsedValue.active ?? parsedValue.value)) {
    return [];
  }

  if (parsedValue.label || parsedValue.name || parsedValue.title || parsedValue.privilege || parsedValue.feature) {
    return [{
      id: fallbackKey,
      label: extractBenefitLabel(fallbackKey, parsedValue),
      ...(extractBenefitMeta(parsedValue) ? { meta: extractBenefitMeta(parsedValue) } : {}),
    }];
  }

  return Object.entries(parsedValue).flatMap(([key, item]) => {
    if (isBonusCreditKey(key) || ["description", "text", "summary", "details"].includes(key)) return [];
    if (isDisabledValue(item)) return [];

    return [{
      id: key,
      label: extractBenefitLabel(key, item),
      ...(extractBenefitMeta(item) ? { meta: extractBenefitMeta(item) } : {}),
    }];
  });
};

const parseBonusCreditAmount = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;

  if (typeof value === "string") {
    const parsedValue = Number(value.replace(/[^\d.]/g, ""));
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : undefined;
  }

  if (isRecord(value)) {
    return parseBonusCreditAmount(value.amount ?? value.value ?? value.credit ?? value.total);
  }

  return undefined;
};

const findBonusCredit = (value: unknown): number | undefined => {
  const parsedValue = parseJsonLike(value);
  if (!isRecord(parsedValue)) return parseBonusCreditAmount(parsedValue);

  for (const [key, item] of Object.entries(parsedValue)) {
    if (isBonusCreditKey(key)) {
      const amount = parseBonusCreditAmount(item);
      if (amount !== undefined) return amount;
    }
  }

  return undefined;
};

const buildMembershipDisplay = (membership: Membership | null): MembershipDisplay => {
  if (!membership) {
    return { benefits: [], description: DESCRIPTION_FALLBACK };
  }

  const parsedDescription = parseJsonLike(membership.description);
  const parsedTerms = parseJsonLike(membership.termsAndConditions);
  const sources = [membership.privileges, membership.metadata, parsedDescription, parsedTerms];
  const seenBenefits = new Set<string>();
  const benefits: BenefitDisplay[] = [];

  membership.includedServices.forEach((service) => {
    const label = service.serviceName.trim();
    if (!label) return;

    const key = `service:${label.toLowerCase()}:${service.durationMinutes ?? ""}`;
    seenBenefits.add(key);
    benefits.push({
      id: service.serviceId || key,
      label,
      ...(service.durationMinutes ? { meta: `${service.durationMinutes} min` } : {}),
    });
  });

  sources.flatMap((source) => collectPrivilegeBenefits(source)).forEach((benefit) => {
    const key = `${benefit.label.toLowerCase()}:${benefit.meta ?? ""}`;
    if (!benefit.label || seenBenefits.has(key)) return;

    seenBenefits.add(key);
    benefits.push(benefit);
  });

  const bonusCredit = membership.bonusCredit ?? sources.map(findBonusCredit).find((amount) => amount !== undefined);

  return {
    benefits,
    ...(bonusCredit !== undefined ? { bonusCredit: formatMoney(bonusCredit) } : {}),
    description: getReadableDescription(membership.description),
  };
};

const getAssignedClientsErrorMessage = (error: string | null) => {
  if (!error) return null;

  return /404|not[_\s-]?found|not found/i.test(error)
    ? "Feature currently unavailable."
    : "Unable to load assigned clients.";
};

export default function MembershipDetailsScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const dispatch = useAppDispatch();
  const membership = useAppSelector((state) => (id ? selectMembershipById(id)(state) : null));
  const loading = useAppSelector(selectMembershipDetailsLoading);
  const error = useAppSelector(selectMembershipDetailsError);
  const deletingIds = useAppSelector(selectDeletingMembershipIds);
  const clients = useAppSelector(selectClients);
  const assignedClients = useAppSelector(selectMembershipClients(id));
  const assignedClientsLoading = useAppSelector(selectMembershipClientsLoading(id));
  const assignedClientsError = useAppSelector(selectMembershipClientsError(id));
  const assignmentMutating = useAppSelector(selectClientMembershipMutating);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [clientPickerVisible, setClientPickerVisible] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const membershipDisplay = useMemo(() => buildMembershipDisplay(membership), [membership]);
  const assignedClientsErrorMessage = getAssignedClientsErrorMessage(assignedClientsError);

  useEffect(() => {
    if (id) {
      void dispatch(fetchMembershipByIdThunk(id));
      void dispatch(fetchMembershipClientsThunk(id));
      void dispatch(fetchClientsThunk({ limit: 50, reset: true }));
    }
  }, [dispatch, id]);

  useEffect(
    () =>
      addRealtimeEntityChangedListener(({ entity }) => {
        if (id && (entity === "clientMemberships" || entity === "memberships" || entity === "clients")) {
          void dispatch(fetchMembershipByIdThunk(id));
          void dispatch(fetchMembershipClientsThunk(id));
        }
      }),
    [dispatch, id],
  );

  useEffect(() => {
    if (__DEV__ && assignedClientsError) {
      console.warn("[MembershipDetails] Assigned clients request failed.", assignedClientsError);
    }
  }, [assignedClientsError]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/memberships" as Href);
  };

  const deletePlan = async () => {
    if (!id) return;
    const result = await dispatch(deleteMembershipThunk(id));
    setConfirmDelete(false);
    if (deleteMembershipThunk.fulfilled.match(result)) {
      router.replace("/memberships" as Href);
    }
  };

  const assignClient = async (client: ClientListItem) => {
    if (!id) return;
    const result = await dispatch(assignClientMembershipThunk({ clientId: client.id, membershipId: id }));

    if (assignClientMembershipThunk.fulfilled.match(result)) {
      setClientPickerVisible(false);
      setToast("Membership assigned successfully.");
      setTimeout(() => setToast(null), 2200);
    } else {
      setToast("Unable to assign membership.");
      setTimeout(() => setToast(null), 2200);
    }
  };

  if (loading && !membership) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!membership) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.content}>
          <Header title="Membership Details" onBack={goBack} />
          <View style={styles.stateCard}>
            <Ionicons name={error ? "cloud-offline-outline" : "diamond-outline"} size={32} color={error ? Colors.error : Colors.primary} />
            <Text style={styles.stateTitle}>{error ? "Unable to load membership" : "Membership not found"}</Text>
            <Text style={styles.stateText}>{error ?? "This membership could not be found."}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const status = getStatus(membership);
  const benefits = membershipDisplay.benefits;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 112 }]} showsVerticalScrollIndicator={false}>
        <Header title="Membership Details" onBack={goBack} />

        <View style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name="diamond-outline" size={30} color={Colors.primary} /></View>
          <Text style={styles.name}>{membership.name}</Text>
          <Text style={styles.type}>{membership.sessionType} membership</Text>
          <View style={[styles.statusBadge, status === "Active" ? styles.statusActive : styles.statusInactive]}>
            <Text style={[styles.statusText, status === "Active" ? styles.statusTextActive : styles.statusTextInactive]}>{status}</Text>
          </View>
          <View style={styles.heroStats}>
            <Stat label="Price" value={formatMoney(membership.price)} />
            <Stat label="Validity" value={membership.validFor} />
          </View>
        </View>

        <Section title="Overview">
          <Detail label="Description" value={membershipDisplay.description} />
          <Detail label="Discount" value={membership.taxRate ? `${membership.taxRate}%` : "No discount configured"} />
          <Detail label="Active Clients" value={String(assignedClients.filter((item) => item.status === "active").length)} />
          <Detail label="Created Date" value={formatDate(membership.createdAt)} />
          <Detail label="Last Updated" value={formatDate(membership.updatedAt)} />
        </Section>

        <Section title="Included Benefits">
          {membershipDisplay.bonusCredit ? (
            <View style={styles.bonusCreditRow}>
              <Ionicons name="wallet-outline" size={17} color={Colors.primary} />
              <View style={styles.benefitCopy}>
                <Text numberOfLines={1} style={styles.benefitTitle}>Bonus Credit</Text>
                <Text numberOfLines={1} style={styles.benefitMeta}>{membershipDisplay.bonusCredit}</Text>
              </View>
            </View>
          ) : null}
          {benefits.length > 0 ? benefits.map((benefit) => (
            <View key={benefit.id} style={styles.benefitRow}>
              <Ionicons name="checkmark-circle-outline" size={17} color={Colors.primary} />
              <View style={styles.benefitCopy}>
                <Text numberOfLines={1} ellipsizeMode="tail" style={styles.benefitTitle}>{benefit.label}</Text>
                {benefit.meta ? <Text numberOfLines={1} ellipsizeMode="tail" style={styles.benefitMeta}>{benefit.meta}</Text> : null}
              </View>
            </View>
          )) : membershipDisplay.bonusCredit ? null : <Text style={styles.mutedText}>No benefits available.</Text>}
        </Section>

        <Section title="Assigned Clients">
          {assignedClientsLoading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : assignedClientsErrorMessage ? (
            <Text style={styles.mutedText}>{assignedClientsErrorMessage}</Text>
          ) : assignedClients.length === 0 ? (
            <Text style={styles.mutedText}>No assigned clients.</Text>
          ) : (
            assignedClients.map((assignment) => (
              <View key={assignment.id} style={styles.clientAssignmentRow}>
                <View style={styles.clientAssignmentIcon}>
                  <Ionicons name="person-outline" size={16} color={Colors.primary} />
                </View>
                <View style={styles.clientAssignmentCopy}>
                  <Text numberOfLines={1} style={styles.clientAssignmentName}>{assignment.clientName}</Text>
                  <Text style={styles.clientAssignmentMeta}>
                    {formatStatusLabel(assignment.status)} - Expires {formatDate(assignment.expiresAt ?? "")}
                  </Text>
                </View>
                <Text style={styles.clientAssignmentBenefits}>
                  {assignment.remainingBenefits ?? "-"} left
                </Text>
              </View>
            ))
          )}
        </Section>
      </ScrollView>

      <View style={[styles.stickyActions, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity activeOpacity={0.88} onPress={() => router.push(`/memberships/${membership.id}/edit` as Href)} style={styles.primaryAction}>
          <Ionicons name="create-outline" size={17} color="#FFFFFF" />
          <Text style={styles.primaryActionText}>Edit Membership</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.88} onPress={() => setConfirmDelete(true)} style={styles.dangerAction}>
          {deletingIds.includes(membership.id) ? <ActivityIndicator color={Colors.error} /> : <Ionicons name="trash-outline" size={17} color={Colors.error} />}
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.88} disabled={assignmentMutating} onPress={() => setClientPickerVisible(true)} style={styles.secondaryAction}>
          {assignmentMutating ? <ActivityIndicator color={Colors.primary} size="small" /> : <Ionicons name="person-add-outline" size={17} color={Colors.primary} />}
        </TouchableOpacity>
      </View>

      {toast ? <View style={[styles.toast, { bottom: insets.bottom + 86 }]}><Text style={styles.toastText}>{toast}</Text></View> : null}

      <Modal transparent animationType="fade" visible={confirmDelete} onRequestClose={() => setConfirmDelete(false)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialog}>
            <View style={styles.dialogIcon}><Ionicons name="trash-outline" size={24} color={Colors.error} /></View>
            <Text style={styles.dialogTitle}>Delete membership?</Text>
            <Text style={styles.dialogText}>This action cannot be undone. Clients already assigned to this plan may be affected in backend records.</Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={() => setConfirmDelete(false)} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => void deletePlan()} style={styles.deleteButton}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ClientPickerModal
        clients={clients}
        onClose={() => setClientPickerVisible(false)}
        onSelect={(client) => void assignClient(client)}
        saving={assignmentMutating}
        visible={clientPickerVisible}
      />
    </SafeAreaView>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.headerRow}>
      <TouchableOpacity activeOpacity={0.84} hitSlop={12} onPress={onBack} style={styles.headerButton}><Ionicons name="chevron-back" size={18} color={Colors.primary} /></TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerButtonGhost} />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function Detail({ label, value }: { label: string; value: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

function ClientPickerModal({
  clients,
  onClose,
  onSelect,
  saving,
  visible,
}: {
  clients: ClientListItem[];
  onClose: () => void;
  onSelect: (client: ClientListItem) => void;
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
            <Text style={styles.pickerTitle}>Assign to Client</Text>
            <TouchableOpacity onPress={onClose} style={styles.pickerClose}>
              <Ionicons name="close" size={18} color={Colors.text2} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.pickerList}>
            {clients.map((client) => (
              <TouchableOpacity
                activeOpacity={0.84}
                disabled={saving}
                key={client.id}
                onPress={() => onSelect(client)}
                style={styles.clientOption}
              >
                <View style={styles.clientOptionAvatar}>
                  <Text style={styles.clientOptionInitials}>{client.initials}</Text>
                </View>
                <View style={styles.clientOptionCopy}>
                  <Text numberOfLines={1} style={styles.clientOptionName}>{client.fullName}</Text>
                  <Text numberOfLines={1} style={styles.clientOptionMeta}>{client.phone}</Text>
                </View>
                {saving ? <ActivityIndicator color={Colors.primary} size="small" /> : null}
              </TouchableOpacity>
            ))}
            {clients.length === 0 ? <Text style={styles.mutedText}>No clients available.</Text> : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: { backgroundColor: Colors.bg, flex: 1 },
  content: { paddingHorizontal: AppLayout.contentHorizontalPadding, paddingTop: Spacing.sm },
  centered: { alignItems: "center", flex: 1, justifyContent: "center" },
  headerRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.lg },
  headerButton: { alignItems: "center", backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: AppRadius.control, borderWidth: 1, height: AppLayout.headerActionSize, justifyContent: "center", width: AppLayout.headerActionSize },
  headerButtonGhost: { width: AppLayout.headerActionSize },
  headerTitle: { color: Colors.heading, fontSize: 20, fontWeight: "900" },
  hero: { alignItems: "center", backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: AppRadius.card, borderWidth: 1, padding: Spacing.xl },
  heroIcon: { alignItems: "center", backgroundColor: Colors.bg2, borderRadius: Radius.xl, height: 70, justifyContent: "center", width: 70 },
  name: { color: Colors.heading, fontSize: 24, fontWeight: "900", marginTop: Spacing.md, textAlign: "center" },
  type: { color: Colors.text2, fontSize: 13, fontWeight: "700", marginTop: 4, textTransform: "capitalize" },
  statusBadge: { borderRadius: Radius.full, marginTop: Spacing.md, paddingHorizontal: 12, paddingVertical: 6 },
  statusActive: { backgroundColor: Colors.successBg },
  statusInactive: { backgroundColor: Colors.errorBg },
  statusText: { fontSize: 11, fontWeight: "900" },
  statusTextActive: { color: Colors.success },
  statusTextInactive: { color: Colors.error },
  heroStats: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.lg, width: "100%" },
  stat: { alignItems: "center", backgroundColor: Colors.bg, borderRadius: Radius.lg, flex: 1, padding: Spacing.md },
  statValue: { color: Colors.heading, fontSize: 15, fontWeight: "900" },
  statLabel: { color: Colors.text2, fontSize: 11, fontWeight: "700", marginTop: 4 },
  section: { backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: AppRadius.card, borderWidth: 1, marginTop: Spacing.md, padding: Spacing.lg },
  sectionTitle: { color: Colors.heading, fontSize: 16, fontWeight: "900", marginBottom: Spacing.md },
  detailRow: { borderBottomColor: Colors.border, borderBottomWidth: 1, paddingVertical: 11 },
  detailLabel: { color: Colors.text2, fontSize: 12, fontWeight: "800" },
  detailValue: { color: Colors.heading, fontSize: 14, fontWeight: "800", marginTop: 4 },
  bonusCreditRow: { alignItems: "center", backgroundColor: Colors.bg2, borderRadius: Radius.md, flexDirection: "row", marginBottom: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: 10 },
  benefitRow: { alignItems: "center", flexDirection: "row", paddingVertical: 9 },
  benefitCopy: { flex: 1, marginLeft: Spacing.sm, minWidth: 0 },
  benefitTitle: { color: Colors.heading, fontSize: 14, fontWeight: "800" },
  benefitMeta: { color: Colors.text2, fontSize: 12, marginTop: 2 },
  mutedText: { color: Colors.text2, fontSize: 13, fontWeight: "700" },
  errorText: { color: Colors.error, fontSize: 13, fontWeight: "700" },
  clientAssignmentBenefits: { color: Colors.primary, fontSize: 12, fontWeight: "900" },
  clientAssignmentCopy: { flex: 1, minWidth: 0 },
  clientAssignmentIcon: { alignItems: "center", backgroundColor: Colors.bg2, borderRadius: Radius.md, height: 36, justifyContent: "center", width: 36 },
  clientAssignmentMeta: { color: Colors.text2, fontSize: 12, marginTop: 2 },
  clientAssignmentName: { color: Colors.heading, fontSize: 14, fontWeight: "900" },
  clientAssignmentRow: { alignItems: "center", borderBottomColor: Colors.border, borderBottomWidth: 1, flexDirection: "row", gap: Spacing.sm, paddingVertical: 10 },
  clientOption: { alignItems: "center", borderBottomColor: Colors.border, borderBottomWidth: 1, flexDirection: "row", gap: Spacing.md, minHeight: 62, paddingVertical: Spacing.sm },
  clientOptionAvatar: { alignItems: "center", backgroundColor: Colors.bg2, borderRadius: Radius.lg, height: 42, justifyContent: "center", width: 42 },
  clientOptionCopy: { flex: 1, minWidth: 0 },
  clientOptionInitials: { color: Colors.primaryDark, fontSize: 13, fontWeight: "900" },
  clientOptionMeta: { color: Colors.text2, fontSize: 12, marginTop: 3 },
  clientOptionName: { color: Colors.heading, fontSize: 14, fontWeight: "900" },
  modalOverlay: { backgroundColor: "rgba(0,0,0,0.36)", flex: 1, justifyContent: "flex-end" },
  pickerClose: { alignItems: "center", height: 34, justifyContent: "center", width: 34 },
  pickerHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.sm },
  pickerList: { maxHeight: 420 },
  pickerSheet: { backgroundColor: Colors.card, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg },
  pickerTitle: { color: Colors.heading, fontSize: 18, fontWeight: "900" },
  stateCard: { alignItems: "center", backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: AppRadius.card, borderWidth: 1, padding: Spacing.xxl },
  stateTitle: { color: Colors.heading, fontSize: 19, fontWeight: "900", marginTop: Spacing.md, textAlign: "center" },
  stateText: { color: Colors.text2, fontSize: 13, lineHeight: 20, marginTop: Spacing.sm, textAlign: "center" },
  stickyActions: { alignItems: "center", backgroundColor: Colors.card, borderTopColor: Colors.border, borderTopWidth: 1, flexDirection: "row", gap: Spacing.sm, left: 0, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, position: "absolute", right: 0, bottom: 0 },
  primaryAction: { alignItems: "center", backgroundColor: Colors.primary, borderRadius: Radius.full, flex: 1, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 50 },
  primaryActionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  dangerAction: { alignItems: "center", backgroundColor: Colors.errorBg, borderRadius: Radius.full, height: 50, justifyContent: "center", width: 50 },
  secondaryAction: { alignItems: "center", backgroundColor: Colors.bg2, borderRadius: Radius.full, height: 50, justifyContent: "center", width: 50 },
  toast: { alignSelf: "center", backgroundColor: Colors.heading, borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: 12, position: "absolute" },
  toastText: { color: Colors.bg, fontSize: 12, fontWeight: "900" },
  dialogOverlay: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.34)", flex: 1, justifyContent: "center", padding: Spacing.lg },
  dialog: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: Spacing.xl, width: "100%" },
  dialogIcon: { alignItems: "center", backgroundColor: Colors.errorBg, borderRadius: Radius.lg, height: 52, justifyContent: "center", width: 52 },
  dialogTitle: { color: Colors.heading, fontSize: 20, fontWeight: "900", marginTop: Spacing.md },
  dialogText: { color: Colors.text2, fontSize: 13, lineHeight: 20, marginTop: Spacing.sm },
  dialogActions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.xl },
  cancelButton: { alignItems: "center", backgroundColor: Colors.bg2, borderRadius: Radius.full, flex: 1, paddingVertical: 13 },
  deleteButton: { alignItems: "center", backgroundColor: Colors.error, borderRadius: Radius.full, flex: 1, paddingVertical: 13 },
  cancelText: { color: Colors.heading, fontSize: 13, fontWeight: "900" },
  deleteText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
});
