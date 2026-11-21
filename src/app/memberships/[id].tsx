import { pearl } from "@/components/auth/pearl/tokens";
import { useRegionalPreferences } from "@/localization/preferences";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { AppBackButton } from "@/components/ui/AppBackButton";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { maskPhone } from "@/utils/maskPhone";
import { Text } from "@/components/ui/AppTypography";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing } from "@/constants/theme";
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
import { usePearlColors, type PearlColors as ThemeColors } from "@/components/auth/pearl/usePearlColors";
import {
  getMembershipAppliesToLabel,
  getMembershipMeta,
  getMembershipPricingType,
  getMembershipTypeLabel,
} from "@/features/membership/membershipMeta";
import type { ClientListItem } from "@/types/client";
import type { Membership } from "@/types/membership";
import { formatAppDate } from "@/utils/dateTime";
import { formatCurrency as formatMoney } from "@/utils/currency";

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
  description: string;
};

const DESCRIPTION_FALLBACK = "No description available.";

const parseJsonLike = (value: unknown) => {
  if (typeof value !== "string") return value;

  const text = value.trim();
  if (!text || (!text.startsWith("{") && !text.startsWith("["))) return value;

  try {
    return JSON.parse(text) as unknown;
  } catch {
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

  return {
    benefits,
    description: getReadableDescription(membership.description),
  };
};

/**
 * The plan's configuration as label/value rows for whichever of the three types
 * it is — the same figures the form collects, read back.
 */
const buildBenefitRows = (membership: Membership) => {
  const type = getMembershipPricingType(membership);

  if (type === "loyalty") {
    const tiers = membership.loyaltyTiers ?? [];

    return tiers.length > 0
      ? tiers.map((tier, index) => ({
          label: `Tier ${index + 1}`,
          value: `${tier.thresholdValue} visits → ${tier.discountPercent}% off`,
        }))
      : [{ label: "Tiers", value: "No tiers configured" }];
  }

  if (type === "percentage") {
    const isValidityBased = membership.benefitType === "validity";

    return [
      { label: "Membership Fee", value: formatMoney(membership.price) },
      { label: "Discount %", value: `${membership.discountPercent ?? 0}%` },
      { label: "Benefit Type", value: isValidityBased ? "Validity Based" : "Discount Balance" },
      // A validity plan has no pool at all — the discount simply runs to expiry.
      ...(isValidityBased
        ? []
        : [{ label: "Total Discount Balance", value: formatMoney(membership.discountBalance ?? membership.price) }]),
    ];
  }

  const bonusCredit = getMembershipMeta(membership).bonusCredit ?? 0;

  return [
    { label: "Membership Fee", value: formatMoney(membership.price) },
    { label: "Bonus Credit", value: formatMoney(bonusCredit) },
    { label: "Total Wallet Value", value: formatMoney(membership.price + bonusCredit) },
  ];
};

const getAssignedClientsErrorMessage = (error: string | null) => {
  if (!error) return null;

  return /404|not[_\s-]?found|not found/i.test(error)
    ? "Feature currently unavailable."
    : "Unable to load assigned clients.";
};

export default function MembershipDetailsScreen() {
  "use no memo";
  useRegionalPreferences();
  const Colors = usePearlColors();
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
      <PearlBackground><SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.centered}><ActivityIndicator color={pearl.accentDeep} size="large" /></View>
      </SafeAreaView></PearlBackground>
    );
  }

  if (!membership) {
    return (
      <PearlBackground><SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.content}>
          <Header title="Membership Details" onBack={goBack} />
          <View style={styles.stateCard}>
            <Ionicons name={error ? "cloud-offline-outline" : "diamond-outline"} size={32} color={error ? Colors.error : Colors.primaryText} />
            <Text translate style={styles.stateTitle}>{error ? "Unable to load membership" : "Membership not found"}</Text>
            <Text style={styles.stateText}>{error ?? "This membership could not be found."}</Text>
          </View>
        </View>
      </SafeAreaView></PearlBackground>
    );
  }

  const status = getStatus(membership);
  const benefits = membershipDisplay.benefits;
  const isLoyalty = getMembershipPricingType(membership) === "loyalty";
  const benefitRows = buildBenefitRows(membership);

  return (
    <PearlBackground><SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 112 }]} showsVerticalScrollIndicator={false}>
        <Header title="Membership Details" onBack={goBack} />

        <View style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name="diamond-outline" size={30} color={Colors.primaryText} /></View>
          <Text style={styles.name}>{membership.name}</Text>
          <Text style={styles.type}>{`${getMembershipTypeLabel(membership)} membership`}</Text>
          <View style={[styles.statusBadge, status === "Active" ? styles.statusActive : styles.statusInactive]}>
            <Text style={[styles.statusText, status === "Active" ? styles.statusTextActive : styles.statusTextInactive]}>{status}</Text>
          </View>
          <View style={styles.heroStats}>
            {/* A loyalty plan is free and evergreen: no fee, no expiry. */}
            <Stat label={isLoyalty ? "Joining" : "Price"} value={isLoyalty ? "Free" : formatMoney(membership.price)} />
            <Stat label="Validity" value={isLoyalty ? "No expiry" : membership.validFor} />
          </View>
        </View>

        <Section title="Benefit Configuration">
          {benefitRows.map((row) => (
            <Detail key={row.label} label={row.label} value={row.value} />
          ))}
        </Section>

        <Section title="Overview">
          <Detail label="Description" value={membershipDisplay.description} />
          <Detail label="Membership Type" value={getMembershipTypeLabel(membership)} />
          <Detail label="Applies To" value={getMembershipAppliesToLabel(membership)} />
          <Detail label="Active Clients" value={String(assignedClients.filter((item) => item.status === "active").length)} />
          <Detail label="Created Date" value={formatDate(membership.createdAt)} />
          <Detail label="Last Updated" value={formatDate(membership.updatedAt)} />
        </Section>

        {/* Only for plans that still carry included services or privileges —
            the three current types configure their benefit above instead. */}
        {benefits.length > 0 ? (
        <Section title="Included Benefits">
          {benefits.map((benefit) => (
            <View key={benefit.id} style={styles.benefitRow}>
              <Ionicons name="checkmark-circle-outline" size={17} color={Colors.primaryText} />
              <View style={styles.benefitCopy}>
                <Text translate numberOfLines={1} ellipsizeMode="tail" style={styles.benefitTitle}>{benefit.label}</Text>
                {benefit.meta ? <Text numberOfLines={1} ellipsizeMode="tail" style={styles.benefitMeta}>{benefit.meta}</Text> : null}
              </View>
            </View>
          ))}
        </Section>
        ) : null}

        <Section title="Assigned Clients">
          {assignedClientsLoading ? (
            <ActivityIndicator color={pearl.accentDeep} />
          ) : assignedClientsErrorMessage ? (
            <Text style={styles.mutedText}>{assignedClientsErrorMessage}</Text>
          ) : assignedClients.length === 0 ? (
            <Text translate style={styles.mutedText}>No assigned clients.</Text>
          ) : (
            assignedClients.map((assignment) => (
              <View key={assignment.id} style={styles.clientAssignmentRow}>
                <View style={styles.clientAssignmentIcon}>
                  <Ionicons name="person-outline" size={16} color={Colors.primaryText} />
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
        <TouchableOpacity activeOpacity={0.88} onPress={() => setConfirmDelete(true)} style={styles.dangerAction}>
          {deletingIds.includes(membership.id) ? <ActivityIndicator color={Colors.error} /> : <Ionicons name="trash-outline" size={17} color={Colors.error} />}
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.88} disabled={assignmentMutating} onPress={() => setClientPickerVisible(true)} style={styles.secondaryAction}>
          {assignmentMutating ? <ActivityIndicator color={pearl.accentDeep} size="small" /> : <Ionicons name="person-add-outline" size={17} color={Colors.primaryText} />}
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.88} onPress={() => router.push(`/memberships/${membership.id}/edit` as Href)} style={styles.secondaryAction}>
          <Ionicons name="create-outline" size={17} color={Colors.primaryText} />
        </TouchableOpacity>
      </View>

      {toast ? <View style={[styles.toast, { bottom: insets.bottom + 86 }]}><Text style={styles.toastText}>{toast}</Text></View> : null}

      <ConfirmationModal
        visible={confirmDelete}
        title="Delete membership?"
        description="This action cannot be undone. Clients already assigned to this plan may be affected."
        cancelLabel="Cancel"
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={deletePlan}
      />

      <ClientPickerModal
        clients={clients}
        onClose={() => setClientPickerVisible(false)}
        onSelect={(client) => void assignClient(client)}
        saving={assignmentMutating}
        visible={clientPickerVisible}
      />
    </SafeAreaView></PearlBackground>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  "use no memo";
  useRegionalPreferences();
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.headerRow}>
      <AppBackButton activeOpacity={0.84} hitSlop={12} onPress={onBack} />
      <Text translate style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerButtonGhost} />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  "use no memo";
  useRegionalPreferences();
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text translate style={styles.statLabel}>{label}</Text></View>;
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  "use no memo";
  useRegionalPreferences();
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return <View style={styles.section}><Text translate style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function Detail({ label, value }: { label: string; value: string }) {
  "use no memo";
  useRegionalPreferences();
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return <View style={styles.detailRow}><Text translate style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
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
  "use no memo";
  useRegionalPreferences();
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.modalOverlay}>
        <Pressable style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text translate style={styles.pickerTitle}>Assign to Client</Text>
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
                  <Text numberOfLines={1} style={styles.clientOptionMeta}>{maskPhone(client.phone, client.phoneCountryCode)}</Text>
                </View>
                {saving ? <ActivityIndicator color={pearl.accentDeep} size="small" /> : null}
              </TouchableOpacity>
            ))}
            {clients.length === 0 ? <Text translate style={styles.mutedText}>No clients available.</Text> : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1 },
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
  benefitRow: { alignItems: "center", flexDirection: "row", paddingVertical: 9 },
  benefitCopy: { flex: 1, marginLeft: Spacing.sm, minWidth: 0 },
  benefitTitle: { color: Colors.heading, fontSize: 14, fontWeight: "800" },
  benefitMeta: { color: Colors.text2, fontSize: 12, marginTop: 2 },
  mutedText: { color: Colors.text2, fontSize: 13, fontWeight: "700" },
  clientAssignmentBenefits: { color: Colors.primaryText, fontSize: 12, fontWeight: "900" },
  clientAssignmentCopy: { flex: 1, minWidth: 0 },
  clientAssignmentIcon: { alignItems: "center", backgroundColor: Colors.bg2, borderRadius: Radius.md, height: 36, justifyContent: "center", width: 36 },
  clientAssignmentMeta: { color: Colors.text2, fontSize: 12, marginTop: 2 },
  clientAssignmentName: { color: Colors.heading, fontSize: 14, fontWeight: "900" },
  clientAssignmentRow: { alignItems: "center", borderBottomColor: Colors.border, borderBottomWidth: 1, flexDirection: "row", gap: Spacing.sm, paddingVertical: 10 },
  clientOption: { alignItems: "center", borderBottomColor: Colors.border, borderBottomWidth: 1, flexDirection: "row", gap: Spacing.md, minHeight: 62, paddingVertical: Spacing.sm },
  clientOptionAvatar: { alignItems: "center", backgroundColor: Colors.bg2, borderRadius: Radius.lg, height: 42, justifyContent: "center", width: 42 },
  clientOptionCopy: { flex: 1, minWidth: 0 },
  clientOptionInitials: { color: Colors.primaryText, fontSize: 13, fontWeight: "900" },
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
  dangerAction: { alignItems: "center", backgroundColor: Colors.errorBg, borderRadius: Radius.full, height: 50, justifyContent: "center", width: 50 },
  secondaryAction: { alignItems: "center", backgroundColor: Colors.bg2, borderRadius: Radius.full, height: 50, justifyContent: "center", width: 50 },
  toast: { alignSelf: "center", backgroundColor: Colors.heading, borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: 12, position: "absolute" },
  toastText: { color: Colors.bg, fontSize: 12, fontWeight: "900" },
});
