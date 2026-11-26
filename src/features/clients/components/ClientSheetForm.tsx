import { pearl, pearlGradients } from "@/components/auth/pearl/tokens";
import { usePearlColors, type PearlColors } from "@/components/auth/pearl/usePearlColors";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { DateField } from "@/components/ui/DateField";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { DashboardSpacing as Spacing } from "@/constants/theme";
import { CLIENT_SOURCES } from "@/features/clients/constants/clientSources";
import { LinearGradient } from "expo-linear-gradient";
import type { CountryCode } from "libphonenumber-js";
import { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

/** The stored gender values, shared by the full client form. */
export const CLIENT_GENDER_OPTIONS = ["Female", "Male", "Other"] as const;

export type ClientSheetFormValues = {
  anniversary: string;
  clientSource: string;
  dob: string;
  email: string;
  firstName: string;
  gender: string;
  lastName: string;
  phone: string;
  phoneCountry: CountryCode;
};

export type ClientSheetFormErrors = Partial<
  Record<"anniversary" | "clientSource" | "dob" | "email" | "firstName" | "form" | "gender" | "lastName" | "phone", string>
>;

type ClientSheetFieldsProps = {
  /** Label for the anniversary field, so a caller can mark it required. */
  anniversaryLabel?: string;
  /** Label for the date-of-birth field, so a caller can mark it required. */
  dobLabel?: string;
  errors: ClientSheetFormErrors;
  /** Label for the gender chips, so a caller can mark them required. */
  genderLabel?: string;
  /**
   * Receives only the fields that changed. The caller clears the matching
   * errors — it knows which ones are cross-field (dob / anniversary).
   */
  onChange: (patch: Partial<ClientSheetFormValues>) => void;
  submitting: boolean;
  values: ClientSheetFormValues;
};

/**
 * The client form fields shared by the Edit client and Add client sheets, so
 * both read as the same modal: identical fields, order, labels and spacing.
 *
 * Holds no state and does no saving — each sheet keeps its own state,
 * validation and request, because adding a client and patching one differ
 * (required gender, required dates, duplicate-phone check, prefill).
 *
 * The buttons are NOT part of this: they go in the sheet's `footer` so they
 * stay pinned while the fields scroll. See ClientSheetActions.
 */
export function ClientSheetFields({
  anniversaryLabel = "Anniversary Date",
  dobLabel = "Date of Birth",
  errors,
  genderLabel = "Gender",
  onChange,
  submitting,
  values,
}: ClientSheetFieldsProps) {
  const Colors = usePearlColors(true);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <>
      <View style={styles.row}>
        <View style={styles.half}>
          <Text translate style={styles.label}>First name *</Text>
          <TextInput
            autoCapitalize="words"
            editable={!submitting}
            onChangeText={(value) => onChange({ firstName: value })}
            placeholder="e.g. Ananya"
            placeholderTextColor={pearl.placeholder}
            style={styles.input}
            value={values.firstName}
          />
          {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
        </View>
        <View style={styles.half}>
          <Text translate style={styles.label}>Last name</Text>
          <TextInput
            autoCapitalize="words"
            editable={!submitting}
            onChangeText={(value) => onChange({ lastName: value })}
            placeholder="Optional"
            placeholderTextColor={pearl.placeholder}
            style={styles.input}
            value={values.lastName}
          />
          {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
        </View>
      </View>

      <Text translate style={styles.label}>Phone *</Text>
      <PhoneInput
        countryAware
        country={values.phoneCountry}
        disabled={submitting}
        error={errors.phone}
        onChange={(value) => onChange({ phone: value })}
        onCountryChange={(country) => onChange({ phoneCountry: country })}
        pearlStyle
        placeholder="Enter phone number"
        required
        value={values.phone}
      />

      <View style={styles.field}>
        <Text translate style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          editable={!submitting}
          keyboardType="email-address"
          onChangeText={(value) => onChange({ email: value })}
          placeholder="Optional"
          placeholderTextColor={pearl.placeholder}
          style={styles.input}
          value={values.email}
        />
        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
      </View>

      <DateField
        error={errors.dob}
        label={dobLabel}
        maximumDate={new Date()}
        onChange={(value) => onChange({ dob: value })}
        pearlStyle
        placeholder="Select date of birth"
        value={values.dob}
      />
      <DateField
        error={errors.anniversary}
        label={anniversaryLabel}
        onChange={(value) => onChange({ anniversary: value })}
        pearlStyle
        placeholder="Select anniversary date"
        value={values.anniversary}
      />

      <View style={styles.field}>
        <Text translate style={styles.label}>{genderLabel}</Text>
        <View style={styles.chips}>
          {CLIENT_GENDER_OPTIONS.map((option) => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected: values.gender === option }}
              disabled={submitting}
              key={option}
              onPress={() => onChange({ gender: values.gender === option ? "" : option })}
              style={[styles.chip, values.gender === option && styles.chipSelected]}
            >
              <Text translate style={[styles.chipText, values.gender === option && styles.chipTextSelected]}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}
      </View>

      <View style={styles.lastField}>
        <Text translate style={styles.label}>Client Source</Text>
        <View style={styles.chips}>
          {CLIENT_SOURCES.map((source) => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected: values.clientSource === source.value }}
              disabled={submitting}
              key={source.value}
              onPress={() => onChange({ clientSource: source.value })}
              style={[styles.chip, values.clientSource === source.value && styles.chipSelected]}
            >
              <Text translate style={[styles.chipText, values.clientSource === source.value && styles.chipTextSelected]}>{source.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </>
  );
}

/**
 * Cancel + save, for the sheet's `footer` slot so they stay put while the
 * fields scroll. The whole-form error rides along, otherwise a failed save
 * would report itself off-screen at the bottom of the scroll.
 */
export function ClientSheetActions({ formError, onCancel, onSubmit, submitLabel, submitting }: {
  formError?: string;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitting: boolean;
}) {
  const Colors = usePearlColors(true);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.footerStack}>
      {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
      <View style={styles.actions}>
        <TouchableOpacity activeOpacity={0.84} disabled={submitting} onPress={onCancel} style={styles.cancelButton}>
          <Text translate style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.84} disabled={submitting} onPress={onSubmit} style={[styles.saveButton, submitting && styles.disabled]}>
          <LinearGradient pointerEvents="none" colors={pearlGradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          {submitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text translate style={styles.saveText}>{submitLabel}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (Colors: PearlColors) => StyleSheet.create({
  row: { flexDirection: "row", gap: Spacing.sm },
  half: { flex: 1 },
  field: { marginBottom: Spacing.md },
  // The pinned footer brings its own top padding, so the last field does not
  // also pad the bottom of the scroll.
  lastField: { marginBottom: 0 },
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
  // The sheet's footer is a row; this fills it so the error can sit above.
  footerStack: { flex: 1 },
  actions: { flexDirection: "row", gap: Spacing.sm },
  cancelButton: {
    alignItems: "center", backgroundColor: Colors.bg2, borderColor: Colors.border, borderRadius: 16,
    borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 46,
  },
  cancelText: { color: Colors.heading, fontSize: 14, fontWeight: "700" },
  saveButton: { alignItems: "center", borderRadius: 16, flex: 1, justifyContent: "center", minHeight: 46, overflow: "hidden" },
  saveText: { color: Colors.onPrimary, fontSize: 14, fontWeight: "800" },
  disabled: { opacity: 0.6 },
});
