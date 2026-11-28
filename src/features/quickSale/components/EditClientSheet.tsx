import { pearl } from "@/components/auth/pearl/themedPearl";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { parsePhoneNumber, isValidPhoneNumber, getCountryCallingCode, type CountryCode } from "libphonenumber-js";
import { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";

import {
  CLIENT_GENDER_OPTIONS,
  ClientSheetActions,
  ClientSheetFields,
  type ClientSheetFormErrors,
  type ClientSheetFormValues,
} from "@/features/clients/components/ClientSheetForm";
import { DashboardSpacing as Spacing } from "@/constants/theme";
import { StaffBottomSheet } from "@/features/staff/components/StaffBottomSheet";
import { useAppToast } from "@/hooks/useAppToast";
import { getApiErrorMessage } from "@/services/api";
import { clientService } from "@/services/client.service";
import type { ClientListItem } from "@/types/client";
import { getClientDateFields, toClientDatePayload, validateClientDates } from "@/utils/clientDates";
import { splitFullName } from "@/utils/name";
import { EMAIL_INVALID_MESSAGE, isValidEmail } from "@/utils/validation";

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
export const splitPhone = (e164: string) => {
  const trimmed = e164.trim();
  if (!trimmed) return { phone_country_code: undefined as string | undefined, phone_number: "" };
  try {
    const parsed = parsePhoneNumber(trimmed);
    return { phone_country_code: `+${parsed.countryCallingCode}`, phone_number: parsed.nationalNumber };
  } catch {
    return { phone_country_code: undefined as string | undefined, phone_number: trimmed.replace(/^\+/, "") };
  }
};

const EMPTY_VALUES: ClientSheetFormValues = {
  anniversary: "",
  clientSource: "walk_in",
  dob: "",
  email: "",
  firstName: "",
  gender: "",
  lastName: "",
  phone: "",
  phoneCountry: "IN",
};

/**
 * Quick client edit from Quick Sale and the Calendar booking form — the mobile
 * twin of the web's QuickEditClientModal. Covers the essentials (name, phone,
 * email, date of birth, anniversary, gender, source) without leaving the
 * screen; the full profile (address, messaging preferences, avatar) still lives
 * on the client form screen.
 *
 * The fields themselves come from ClientSheetForm, which the Add client sheet
 * renders too, so both modals look identical.
 *
 * Saves a partial PATCH, so fields this sheet doesn't show are left untouched.
 */
export function EditClientSheet({ clientId, clientName, onClose, onSaved, renderInline = false, visible }: EditClientSheetProps) {
  const toast = useAppToast();
  const loadedRef = useRef<ClientListItem | null>(null);

  const [values, setValues] = useState<ClientSheetFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<ClientSheetFormErrors>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // A changed field clears its own error; the two dates validate against each
  // other, so either one clears both.
  const handleChange = (patch: Partial<ClientSheetFormValues>) => {
    setValues((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current, form: undefined };
      for (const key of Object.keys(patch)) {
        if (key === "dob" || key === "anniversary") {
          next.anniversary = undefined;
          next.dob = undefined;
        } else if (key in next) {
          next[key as keyof ClientSheetFormErrors] = undefined;
        }
      }
      return next;
    });
  };

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
        const nextPhone = toE164(client.phone, client.phoneCountryCode);
        let country: CountryCode = "IN";
        if (nextPhone) {
          try { country = parsePhoneNumber(nextPhone).country ?? "IN"; } catch { country = "IN"; }
        }
        const dates = getClientDateFields(client);
        setValues({
          anniversary: dates.anniversary,
          clientSource: client.clientSource || "walk_in",
          dob: dates.dob,
          email: client.email === "-" ? "" : client.email,
          firstName: name.first_name,
          gender: CLIENT_GENDER_OPTIONS.includes(client.gender as (typeof CLIENT_GENDER_OPTIONS)[number]) ? client.gender : "",
          lastName: name.last_name,
          phone: nextPhone,
          phoneCountry: country,
        });
      })
      .catch((failure) => { if (active) setErrors({ form: getApiErrorMessage(failure) }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [clientId, visible]);

  const save = async () => {
    const trimmedFirstName = values.firstName.trim();
    const trimmedEmail = values.email.trim();
    const trimmedPhone = values.phone.trim();
    const nextErrors: ClientSheetFormErrors = { ...validateClientDates(values.dob, values.anniversary) };

    if (!trimmedFirstName) nextErrors.firstName = "First name is required.";
    if (!trimmedPhone) {
      nextErrors.phone = "Phone number is required.";
    } else {
      const parsed = isValidPhoneNumber(trimmedPhone) ? parsePhoneNumber(trimmedPhone) : null;
      if (!parsed || parsed.countryCallingCode !== getCountryCallingCode(values.phoneCountry)) {
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
        ...toClientDatePayload(values.dob, values.anniversary),
        ...splitPhone(trimmedPhone),
        // Legacy clients can have no gender on record; only send one that was
        // actually chosen so saving never blanks it.
        ...(values.gender ? { gender: values.gender } : {}),
        client_source: values.clientSource || null,
        email: trimmedEmail || null,
        first_name: trimmedFirstName,
        last_name: values.lastName.trim(),
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
      // Cancel / Save stay pinned below the scrolling fields.
      footer={loading ? undefined : (
        <ClientSheetActions
          formError={errors.form}
          onCancel={onClose}
          onSubmit={() => void save()}
          submitLabel="Save changes"
          submitting={saving}
        />
      )}
      onClose={() => { if (!saving) onClose(); }}
      renderInline={renderInline}
      // The sheet scrolls the fields itself; a ScrollView here would nest.
      scrollable={!loading}
      subtitle={clientName}
      title="Edit client"
      visible={visible}
    >
      {loading ? (
        <ActivityIndicator color={pearl.accentDeep} style={styles.loading} />
      ) : (
        <ClientSheetFields
          errors={errors}
          onChange={handleChange}
          submitting={saving}
          values={values}
        />
      )}
    </StaffBottomSheet>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: Spacing.xl },
});
