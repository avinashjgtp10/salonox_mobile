import { pearl, pearlGradients } from "@/components/auth/pearl/tokens";
import { usePearlColors, type PearlColors } from "@/components/auth/pearl/usePearlColors";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { DateField } from "@/components/ui/DateField";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { LinearGradient } from "expo-linear-gradient";
import { parsePhoneNumber, isValidPhoneNumber, getCountryCallingCode, type CountryCode } from "libphonenumber-js";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import { CLIENT_SOURCES } from "@/features/clients/constants/clientSources";
import { DashboardSpacing as Spacing } from "@/constants/theme";
import { StaffBottomSheet } from "@/features/staff/components/StaffBottomSheet";
import { useAppToast } from "@/hooks/useAppToast";
import { getApiErrorMessage } from "@/services/api";
import { clientService } from "@/services/client.service";
import type { ClientListItem } from "@/types/client";
import { getClientDateFields, toClientDatePayload, validateClientDates } from "@/utils/clientDates";
import { splitFullName } from "@/utils/name";
import { EMAIL_INVALID_MESSAGE, isValidEmail } from "@/utils/validation";

// Same stored values the full client form saves.
const GENDER_OPTIONS = ["Female", "Male", "Other"] as const;

type FieldErrors = {
  anniversary?: string;
  dob?: string;
  email?: string;
  firstName?: string;
  form?: string;
  phone?: string;
};

type EditClientSheetProps = {
  clientId: string;
  clientName: string;
  onClose: () => void;
  /** Fires after a successful save so the caller can refresh its own copy. */
  onSaved?: (client: ClientListItem) => void;
  renderInline?: boolean;
  visible: boolean;
};

/** A saved client's phone back into the E.164 value PhoneInput expects. */
const toE164 = (phone: string, countryCode?: string | null) => {
  const trimmed = phone === "-" ? "" : phone.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return trimmed;
  return `${countryCode || "+91"}${trimmed.replace(/\D/g, "")}`;
};

/** E.164 back into the country code + national number the API stores. */
const splitPhone = (e164: string) => {
  const trimmed = e164.trim();
  if (!trimmed) return { phone_country_code: undefined as string | undefined, phone_number: "" };
  try {
    const parsed = parsePhoneNumber(trimmed);
    return { phone_country_code: `+${parsed.countryCallingCode}`, phone_number: parsed.nationalNumber };
  } catch {
    return { phone_country_code: undefined as string | undefined, phone_number: trimmed.replace(/^\+/, "") };
  }
};

/**
 * Quick client edit from Quick Sale and the Calendar booking form — the mobile
 * twin of the web's QuickEditClientModal. Covers the essentials (name, phone,
 * email, date of birth, anniversary, gender, source) without leaving the
 * screen; the full profile (address, messaging preferences, avatar) still lives
 * on the client form screen.
 *
 * Saves a partial PATCH, so fields this sheet doesn't show are left untouched.
 */
export function EditClientSheet({ clientId, clientName, onClose, onSaved, renderInline = false, visible }: EditClientSheetProps) {
  const Colors = usePearlColors(true);
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const toast = useAppToast();
  const loadedRef = useRef<ClientListItem | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>("IN");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [anniversary, setAnniversary] = useState("");
  const [gender, setGender] = useState("");
  const [clientSource, setClientSource] = useState("walk_in");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const clearError = (field: keyof FieldErrors) =>
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));

  useEffect(() => {
    if (!visible || !clientId) return undefined;
    let active = true;
    setErrors({});
    setLoading(true);
    clientService.getClient(clientId)
      .then((client) => {
        if (!active) return;
        loadedRef.current = client;
        const name = splitFullName(client.fullName);
        setFirstName(name.first_name);
        setLastName(name.last_name);
        const nextPhone = toE164(client.phone, client.phoneCountryCode);
        setPhone(nextPhone);
        if (nextPhone) {
          try { setPhoneCountry(parsePhoneNumber(nextPhone).country ?? "IN"); } catch { setPhoneCountry("IN"); }
        }
        setEmail(client.email === "-" ? "" : client.email);
        const dates = getClientDateFields(client);
        setDob(dates.dob);
        setAnniversary(dates.anniversary);
        setGender(GENDER_OPTIONS.includes(client.gender as (typeof GENDER_OPTIONS)[number]) ? client.gender : "");
        setClientSource(client.clientSource || "walk_in");
      })
      .catch((failure) => { if (active) setErrors({ form: getApiErrorMessage(failure) }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [clientId, visible]);

  const save = async () => {
    const trimmedFirstName = firstName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const nextErrors: FieldErrors = { ...validateClientDates(dob, anniversary) };

    if (!trimmedFirstName) nextErrors.firstName = "First name is required.";
    if (!trimmedPhone) {
      nextErrors.phone = "Phone number is required.";
    } else {
      const parsed = isValidPhoneNumber(trimmedPhone) ? parsePhoneNumber(trimmedPhone) : null;
      if (!parsed || parsed.countryCallingCode !== getCountryCallingCode(phoneCountry)) {
        nextErrors.phone = "Enter a valid phone number for the selected country.";
      }
    }
    if (trimmedEmail && !isValidEmail(trimmedEmail)) nextErrors.email = EMAIL_INVALID_MESSAGE;

    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      const result = await clientService.updateClient(clientId, {
        ...toClientDatePayload(dob, anniversary),
        ...splitPhone(trimmedPhone),
        // Legacy clients can have no gender on record; only send one that was
        // actually chosen so saving never blanks it.
        ...(gender ? { gender } : {}),
        client_source: clientSource || null,
        email: trimmedEmail || null,
        first_name: trimmedFirstName,
        last_name: lastName.trim(),
      });
      toast.showSuccess(result.message ?? "Client updated successfully.");
      onSaved?.(result.client);
      onClose();
    } catch (failure) {
      setErrors({ form: getApiErrorMessage(failure) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <StaffBottomSheet
      centered={renderInline}
      onClose={() => { if (!saving) onClose(); }}
      renderInline={renderInline}
      subtitle={clientName}
      title="Edit client"
      visible={visible}
    >
      {loading ? (
        <ActivityIndicator color={pearl.accentDeep} style={styles.loading} />
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.row}>
            <View style={styles.half}>
              <Text translate style={styles.label}>First name *</Text>
              <TextInput
                editable={!saving}
                onChangeText={(value) => { setFirstName(value); clearError("firstName"); }}
                placeholder="e.g. Ananya"
                placeholderTextColor={pearl.placeholder}
                style={styles.input}
                value={firstName}
              />
              {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
            </View>
            <View style={styles.half}>
              <Text translate style={styles.label}>Last name</Text>
              <TextInput
                editable={!saving}
                onChangeText={setLastName}
                placeholder="Optional"
                placeholderTextColor={pearl.placeholder}
                style={styles.input}
                value={lastName}
              />
            </View>
          </View>

          <Text translate style={styles.label}>Phone *</Text>
          <PhoneInput
            countryAware
            country={phoneCountry}
            disabled={saving}
            error={errors.phone}
            onChange={(value) => { setPhone(value); clearError("phone"); }}
            onCountryChange={setPhoneCountry}
            pearlStyle
            placeholder="Enter phone number"
            required
            value={phone}
          />

          <View style={styles.field}>
            <Text translate style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              editable={!saving}
              keyboardType="email-address"
              onChangeText={(value) => { setEmail(value); clearError("email"); }}
              placeholder="Optional"
              placeholderTextColor={pearl.placeholder}
              style={styles.input}
              value={email}
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          <DateField
            error={errors.dob}
            label="Date of Birth"
            maximumDate={new Date()}
            onChange={(value) => { setDob(value); setErrors((current) => ({ ...current, anniversary: undefined, dob: undefined, form: undefined })); }}
            pearlStyle
            placeholder="Select date of birth"
            value={dob}
          />
          <DateField
            error={errors.anniversary}
            label="Anniversary Date"
            onChange={(value) => { setAnniversary(value); clearError("anniversary"); }}
            pearlStyle
            placeholder="Select anniversary date"
            value={anniversary}
          />

          <View style={styles.field}>
            <Text translate style={styles.label}>Gender</Text>
            <View style={styles.chips}>
              {GENDER_OPTIONS.map((option) => (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ selected: gender === option }}
                  disabled={saving}
                  key={option}
                  onPress={() => { setGender(gender === option ? "" : option); clearError("form"); }}
                  style={[styles.chip, gender === option && styles.chipSelected]}
                >
                  <Text translate style={[styles.chipText, gender === option && styles.chipTextSelected]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text translate style={styles.label}>Client Source</Text>
            <View style={styles.chips}>
              {CLIENT_SOURCES.map((source) => (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ selected: clientSource === source.value }}
                  disabled={saving}
                  key={source.value}
                  onPress={() => { setClientSource(source.value); clearError("form"); }}
                  style={[styles.chip, clientSource === source.value && styles.chipSelected]}
                >
                  <Text translate style={[styles.chipText, clientSource === source.value && styles.chipTextSelected]}>{source.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {errors.form ? <Text style={styles.errorText}>{errors.form}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity activeOpacity={0.84} disabled={saving} onPress={onClose} style={styles.cancelButton}>
              <Text translate style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.84} disabled={saving} onPress={() => void save()} style={[styles.saveButton, saving && styles.disabled]}>
              <LinearGradient pointerEvents="none" colors={pearlGradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text translate style={styles.saveText}>Save changes</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </StaffBottomSheet>
  );
}

const createStyles = (Colors: PearlColors) => StyleSheet.create({
  loading: { paddingVertical: Spacing.xl },
  row: { flexDirection: "row", gap: Spacing.sm },
  half: { flex: 1 },
  field: { marginBottom: Spacing.md },
  label: { color: pearl.ink2, fontSize: 12, fontWeight: "600", marginBottom: 8 },
  input: {
    backgroundColor: pearl.field, borderColor: pearl.fieldBorder, borderRadius: 16, borderWidth: 1,
    color: pearl.ink, fontSize: 14, minHeight: 48, paddingHorizontal: 14, paddingVertical: 12,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: pearl.glass, borderColor: pearl.glassBorder, borderRadius: 20,
    borderWidth: 1, paddingHorizontal: 13, paddingVertical: 9,
  },
  chipSelected: { backgroundColor: pearl.accentWash, borderColor: pearl.accentTint },
  chipText: { color: pearl.ink2, fontSize: 12, fontWeight: "600" },
  chipTextSelected: { color: pearl.accentDeep },
  errorText: { color: Colors.error, fontSize: 12, fontWeight: "700", marginBottom: Spacing.sm, marginTop: 4 },
  actions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm },
  cancelButton: {
    alignItems: "center", backgroundColor: Colors.bg2, borderColor: Colors.border, borderRadius: 16,
    borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 46,
  },
  cancelText: { color: Colors.heading, fontSize: 14, fontWeight: "700" },
  saveButton: { alignItems: "center", borderRadius: 16, flex: 1, justifyContent: "center", minHeight: 46, overflow: "hidden" },
  saveText: { color: Colors.onPrimary, fontSize: 14, fontWeight: "800" },
  disabled: { opacity: 0.6 },
});
