import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import {
  createMembershipThunk,
  fetchMembershipByIdThunk,
  fetchMembershipsThunk,
  updateMembershipThunk,
} from "@/middleware/membership/membership.thunk";
import { fetchServicesThunk } from "@/middleware/service/service.thunk";
import {
  selectMembershipById,
  selectMembershipDetailsError,
  selectMembershipDetailsLoading,
  selectMembershipMutationError,
  selectMembershipMutationLoading,
  selectMembershipsQuery,
} from "@/store/membership/membership.slice";
import { selectServices, selectServicesLoading } from "@/store/service/service.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { CreateMembershipRequest } from "@/types/membership";
import { AppStatusBar } from "@/components/ui/AppStatusBar";

type MembershipFormScreenProps = {
  membershipId?: string;
  mode: "create" | "edit";
};

const SESSION_TYPES = ["limited", "unlimited"] as const;
const VALIDITY_OPTIONS = ["30 days", "90 days", "6 months", "1 year"] as const;
const COLOR_OPTIONS = [
  { label: "Ink", value: "cyan" },
  { label: "Soft", value: "blue" },
  { label: "Faint", value: "violet" },
  { label: "Line", value: "gold" },
] as const;
const COLORS = COLOR_OPTIONS.map((option) => option.value);

const getRejectedMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};

export function MembershipFormScreen({ membershipId, mode }: MembershipFormScreenProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const membership = useAppSelector((state) => (membershipId ? selectMembershipById(membershipId)(state) : null));
  const detailsLoading = useAppSelector(selectMembershipDetailsLoading);
  const detailsError = useAppSelector(selectMembershipDetailsError);
  const mutationLoading = useAppSelector(selectMembershipMutationLoading);
  const mutationError = useAppSelector(selectMembershipMutationError);
  const query = useAppSelector(selectMembershipsQuery);
  const services = useAppSelector(selectServices);
  const servicesLoading = useAppSelector(selectServicesLoading);
  const hasPrefilledRef = useRef(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sessionType, setSessionType] = useState<(typeof SESSION_TYPES)[number]>("limited");
  const [numberOfSessions, setNumberOfSessions] = useState("");
  const [validFor, setValidFor] = useState<(typeof VALIDITY_OPTIONS)[number]>("30 days");
  const [price, setPrice] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [colour, setColour] = useState<(typeof COLORS)[number]>("cyan");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [terms, setTerms] = useState("");
  const [enableOnlineSales, setEnableOnlineSales] = useState(true);
  const [enableOnlineRedemption, setEnableOnlineRedemption] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const isSubmitting = mutationLoading || isFinishing;

  useEffect(() => {
    if (mode === "edit" && membershipId) {
      void dispatch(fetchMembershipByIdThunk(membershipId));
    }
  }, [dispatch, membershipId, mode]);

  useEffect(() => {
    if (services.length === 0) {
      void dispatch(fetchServicesThunk({ limit: 50, offset: 0, reset: true }));
    }
  }, [dispatch, services.length]);

  useEffect(() => {
    if (mode !== "edit" || !membership || hasPrefilledRef.current) return;
    setName(membership.name);
    setDescription(membership.description ?? "");
    setSessionType(membership.sessionType === "unlimited" ? "unlimited" : "limited");
    setNumberOfSessions(membership.numberOfSessions ? String(membership.numberOfSessions) : "");
    setValidFor(VALIDITY_OPTIONS.includes(membership.validFor as never) ? (membership.validFor as typeof validFor) : "30 days");
    setPrice(String(membership.price));
    setTaxRate(membership.taxRate ? String(membership.taxRate) : "");
    setColour(COLORS.includes(membership.colour as never) ? (membership.colour as typeof colour) : "cyan");
    setSelectedServiceIds(membership.includedServices.map((service) => service.serviceId));
    setTerms(membership.termsAndConditions ?? "");
    setEnableOnlineSales(membership.enableOnlineSales);
    setEnableOnlineRedemption(membership.enableOnlineRedemption);
    hasPrefilledRef.current = true;
  }, [membership, mode, colour, validFor]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/memberships" as Href);
  };

  const buildPayload = (): CreateMembershipRequest | null => {
    const trimmedName = name.trim();
    const parsedPrice = Number(price.trim());
    const parsedSessions = numberOfSessions.trim() ? Number(numberOfSessions.trim()) : undefined;
    const parsedTax = taxRate.trim() ? Number(taxRate.trim()) : undefined;
    const includedServices = services
      .filter((service) => selectedServiceIds.includes(service.id))
      .map((service) => ({
        ...(service.durationMinutes ? { durationMinutes: service.durationMinutes } : {}),
        serviceId: service.id,
        serviceName: service.name,
      }));

    if (!trimmedName) return setFormError("Membership name is required."), null;
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return setFormError("Enter a valid price."), null;
    if (sessionType === "limited" && (!parsedSessions || parsedSessions < 1)) {
      return setFormError("Limited memberships need a valid number of sessions."), null;
    }
    if (typeof parsedTax === "number" && (!Number.isFinite(parsedTax) || parsedTax < 0)) {
      return setFormError("Enter a valid discount/tax value."), null;
    }

    return {
      colour,
      description: description.trim() || undefined,
      enableOnlineRedemption,
      enableOnlineSales,
      includedServices,
      name: trimmedName,
      numberOfSessions: sessionType === "limited" ? parsedSessions : undefined,
      price: parsedPrice,
      sessionType,
      taxRate: parsedTax,
      termsAndConditions: terms.trim() || undefined,
      validFor,
    };
  };

  const refreshList = () =>
    dispatch(fetchMembershipsThunk({ ...query, refresh: true, reset: true }));

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((currentIds) =>
      currentIds.includes(serviceId)
        ? currentIds.filter((id) => id !== serviceId)
        : [...currentIds, serviceId],
    );
  };

  const submit = async () => {
    setFormError(null);
    setSuccessMessage(null);
    const payload = buildPayload();
    if (!payload) return;

    const result =
      mode === "create"
        ? await dispatch(createMembershipThunk(payload))
        : membershipId
          ? await dispatch(updateMembershipThunk({ membershipId, data: payload }))
          : null;

    if (!result) return;
    if (createMembershipThunk.rejected.match(result) || updateMembershipThunk.rejected.match(result)) {
      setFormError(getRejectedMessage(result.payload, "Unable to save membership."));
      return;
    }

    setSuccessMessage(mode === "create" ? "Membership created successfully." : "Membership updated successfully.");
    setIsFinishing(true);
    await refreshList();
    setTimeout(() => {
      setIsFinishing(false);
      goBack();
    }, 550);
  };

  if (mode === "edit" && detailsLoading && !membership) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />
      <KeyboardAwareScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.flex}>
          <View style={styles.headerRow}>
            <TouchableOpacity activeOpacity={0.84} disabled={isSubmitting} onPress={goBack} style={styles.iconButton}>
              <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{mode === "create" ? "New Membership" : "Edit Membership"}</Text>
            <View style={styles.iconButtonGhost} />
          </View>

          <View style={styles.card}>
            <Field label="Membership Name" icon="sparkles-outline" value={name} onChangeText={setName} placeholder="e.g. Glow Club" />
            <Segmented label="Membership Type" options={SESSION_TYPES} value={sessionType} onChange={setSessionType} />
            <Field label="Price" icon="cash-outline" value={price} onChangeText={setPrice} placeholder="0" keyboardType="decimal-pad" />
            <Segmented label="Validity" options={VALIDITY_OPTIONS} value={validFor} onChange={setValidFor} />
            {sessionType === "limited" ? (
              <Field label="Number of Sessions" icon="repeat-outline" value={numberOfSessions} onChangeText={setNumberOfSessions} placeholder="6" keyboardType="number-pad" />
            ) : null}
            <Field label="Description" icon="document-text-outline" value={description} onChangeText={setDescription} placeholder="Describe the membership" multiline />
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Included Benefits</Text>
              <View style={styles.servicePicker}>
                {servicesLoading && services.length === 0 ? (
                  <View style={styles.serviceLoadingRow}>
                    <ActivityIndicator color={Colors.primary} size="small" />
                    <Text style={styles.serviceLoadingText}>Loading services...</Text>
                  </View>
                ) : services.length > 0 ? (
                  services.map((service) => {
                    const selected = selectedServiceIds.includes(service.id);
                    return (
                      <TouchableOpacity
                        key={service.id}
                        activeOpacity={0.84}
                        onPress={() => toggleService(service.id)}
                        style={[styles.serviceChip, selected && styles.serviceChipSelected]}
                      >
                        <Ionicons
                          name={selected ? "checkmark-circle" : "add-circle-outline"}
                          size={15}
                          color={selected ? "#FFFFFF" : Colors.primary}
                        />
                        <Text style={[styles.serviceChipText, selected && styles.serviceChipTextSelected]}>
                          {service.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={styles.serviceLoadingText}>No services available to include yet.</Text>
                )}
              </View>
            </View>
            <Field label="Discount" icon="ticket-outline" value={taxRate} onChangeText={setTaxRate} placeholder="Optional percentage" keyboardType="decimal-pad" />
            <Segmented label="Colour" options={COLOR_OPTIONS} value={colour} onChange={setColour} />
            <Toggle label="Online Sales" value={enableOnlineSales} onPress={() => setEnableOnlineSales((value) => !value)} />
            <Toggle label="Online Redemption" value={enableOnlineRedemption} onPress={() => setEnableOnlineRedemption((value) => !value)} />
            <Field label="Terms" icon="reader-outline" value={terms} onChangeText={setTerms} placeholder="Optional terms and conditions" multiline />

            {formError || mutationError || detailsError ? (
              <View style={styles.messageError}>
                <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
                <Text style={styles.messageErrorText}>{formError ?? mutationError ?? detailsError}</Text>
              </View>
            ) : null}
            {successMessage ? (
              <View style={styles.messageSuccess}>
                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.success} />
                <Text style={styles.messageSuccessText}>{successMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity activeOpacity={0.88} disabled={isSubmitting} onPress={submit} style={[styles.submitButton, isSubmitting && styles.disabled]}>
              {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />}
              <Text style={styles.submitText}>{isSubmitting ? "Saving..." : "Save Membership"}</Text>
            </TouchableOpacity>
          </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function Field({ icon, label, ...props }: { icon: keyof typeof Ionicons.glyphMap; label: string } & React.ComponentProps<typeof TextInput>) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputContainer, props.multiline && styles.inputContainerMultiline]}>
        <Ionicons name={icon} size={18} color={Colors.text2} />
        <TextInput placeholderTextColor={Colors.placeholder} style={[styles.textInput, props.multiline && styles.textArea]} {...props} />
      </View>
    </View>
  );
}

function Segmented<T extends string>({ label, onChange, options, value }: { label: string; onChange: (value: T) => void; options: readonly (T | { label: string; value: T })[]; value: T }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.segmented}>
        {options.map((option) => {
          const optionValue = typeof option === "string" ? option : option.value;
          const optionLabel = typeof option === "string" ? option : option.label;
          const active = optionValue === value;
          return (
            <TouchableOpacity key={optionValue} activeOpacity={0.84} onPress={() => onChange(optionValue)} style={[styles.segment, active && styles.segmentActive]}>
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{optionLabel}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function Toggle({ label, onPress, value }: { label: string; onPress: () => void; value: boolean }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <TouchableOpacity activeOpacity={0.84} onPress={onPress} style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggle, value && styles.toggleActive]}>
        <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { backgroundColor: Colors.bg, flex: 1 },
  centered: { alignItems: "center", flex: 1, justifyContent: "center" },
  content: { paddingBottom: AppLayout.contentBottomPadding, paddingHorizontal: AppLayout.contentHorizontalPadding, paddingTop: Spacing.sm },
  headerRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.lg },
  iconButton: { alignItems: "center", backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: AppRadius.control, borderWidth: 1, height: AppLayout.headerActionSize, justifyContent: "center", width: AppLayout.headerActionSize },
  iconButtonGhost: { width: AppLayout.headerActionSize },
  headerTitle: { color: Colors.heading, fontSize: AppLayout.headerTitleFontSize, fontWeight: "800" },
  card: { backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: AppRadius.card, borderWidth: 1, padding: AppLayout.cardPadding },
  inputGroup: { marginBottom: Spacing.lg },
  inputLabel: { color: Colors.text2, fontSize: 13, fontWeight: "800", marginBottom: Spacing.sm },
  inputContainer: { alignItems: "center", backgroundColor: Colors.bg, borderColor: Colors.border, borderRadius: AppRadius.control, borderWidth: 1, flexDirection: "row", minHeight: 52, paddingHorizontal: Spacing.md },
  inputContainerMultiline: { alignItems: "flex-start", paddingTop: 14 },
  textInput: { color: Colors.heading, flex: 1, fontSize: 15, marginLeft: Spacing.sm, minHeight: 50 },
  textArea: { minHeight: 86, textAlignVertical: "top" },
  segmented: { backgroundColor: Colors.bg, borderColor: Colors.border, borderRadius: AppRadius.control, borderWidth: 1, flexDirection: "row", padding: 4 },
  segment: { alignItems: "center", borderRadius: Radius.md, flex: 1, justifyContent: "center", minHeight: 40, paddingHorizontal: 8 },
  segmentActive: { backgroundColor: Colors.primary },
  segmentText: { color: Colors.text2, fontSize: 12, fontWeight: "800", textTransform: "capitalize" },
  segmentTextActive: { color: "#FFFFFF" },
  toggleRow: { alignItems: "center", backgroundColor: Colors.bg, borderColor: Colors.border, borderRadius: AppRadius.control, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.md, minHeight: 52, paddingHorizontal: Spacing.md },
  toggleLabel: { color: Colors.heading, fontSize: 14, fontWeight: "800" },
  toggle: { backgroundColor: Colors.border, borderRadius: Radius.full, height: 28, justifyContent: "center", padding: 3, width: 52 },
  toggleActive: { backgroundColor: Colors.primary },
  toggleKnob: { backgroundColor: Colors.card, borderRadius: Radius.full, height: 22, width: 22 },
  toggleKnobActive: { alignSelf: "flex-end" },
  servicePicker: { backgroundColor: Colors.bg, borderColor: Colors.border, borderRadius: AppRadius.control, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 8, padding: Spacing.md },
  serviceLoadingRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  serviceLoadingText: { color: Colors.text2, fontSize: 13, fontWeight: "700" },
  serviceChip: { alignItems: "center", backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: Radius.full, borderWidth: 1, flexDirection: "row", gap: 6, paddingHorizontal: 10, paddingVertical: 8 },
  serviceChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  serviceChipText: { color: Colors.heading, fontSize: 12, fontWeight: "800" },
  serviceChipTextSelected: { color: "#FFFFFF" },
  messageError: { alignItems: "center", backgroundColor: Colors.errorBg, borderRadius: AppRadius.control, flexDirection: "row", marginBottom: Spacing.md, padding: Spacing.md },
  messageErrorText: { color: Colors.error, flex: 1, fontSize: 13, fontWeight: "700", marginLeft: Spacing.sm },
  messageSuccess: { alignItems: "center", backgroundColor: Colors.successBg, borderRadius: AppRadius.control, flexDirection: "row", marginBottom: Spacing.md, padding: Spacing.md },
  messageSuccessText: { color: Colors.success, flex: 1, fontSize: 13, fontWeight: "700", marginLeft: Spacing.sm },
  submitButton: { alignItems: "center", backgroundColor: Colors.primary, borderRadius: AppRadius.pill, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 54 },
  disabled: { opacity: 0.68 },
  submitText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
});
