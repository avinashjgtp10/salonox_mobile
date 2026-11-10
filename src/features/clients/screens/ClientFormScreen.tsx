import { PearlActionFooter } from "@/components/ui/PearlActionFooter";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl, pearlTones } from "@/components/auth/pearl/tokens";
import { ClientButton, ClientChips, clientUi } from "../components/ClientPearl";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { maskPhone } from "@/utils/maskPhone";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { isValidPhoneNumber, parsePhoneNumber, type CountryCode } from "libphonenumber-js";
import { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, StyleSheet, Switch, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { DateField } from "@/components/ui/DateField";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import {
  createClientThunk,
  filterClientsThunk,
  fetchClientByIdThunk,
  fetchClientsThunk,
  searchClientsThunk,
  updateClientThunk,
} from "@/middleware/client/client.thunk";
import {
  selectClientById,
  selectClientCreateError,
  selectClientCreating,
  selectClientDetailsError,
  selectClientDetailsLoading,
  selectClientUpdateError,
  selectClientUpdating,
  selectClientsActiveFilter,
  selectClientsQuery,
} from "@/store/client/client.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { usePearlColors, type PearlColors as ThemeColors } from "@/components/auth/pearl/usePearlColors";
import { EMAIL_INVALID_MESSAGE, isValidEmail, PHONE_DIGIT_COUNT, PHONE_INVALID_MESSAGE } from "@/utils/validation";
import { splitFullName } from "@/utils/name";
import { useValidationScroll } from "@/hooks/useValidationScroll";

const GENDER_OPTIONS = ["Female", "Male", "Other"] as const;

type ClientField = "email" | "firstName" | "phone" | "birthDate" | "anniversary";
type ClientFieldErrors = Partial<Record<ClientField, string>>;
const VALIDATION_FIELD_ORDER: ClientField[] = ["firstName", "phone", "email", "birthDate", "anniversary"];

const getPhoneForEdit = (clientPhone: string, phoneCountryCode?: string | null) => {
  const trimmedPhone = clientPhone === "-" ? "" : clientPhone.trim();

  if (!trimmedPhone) {
    return "";
  }

  if (trimmedPhone.startsWith("+")) {
    return trimmedPhone;
  }

  return `${phoneCountryCode || "+91"}${trimmedPhone.replace(/\D/g, "")}`;
};

const splitPhoneForRequest = (e164Phone: string) => {
  const trimmedPhone = e164Phone.trim();

  if (!trimmedPhone) {
    return { phoneCountryCode: undefined as string | undefined, phoneNumber: "" };
  }

  try {
    const parsed = parsePhoneNumber(trimmedPhone);

    return {
      phoneCountryCode: `+${parsed.countryCallingCode}`,
      phoneNumber: parsed.nationalNumber,
    };
  } catch {
    return {
      phoneCountryCode: undefined as string | undefined,
      phoneNumber: trimmedPhone.replace(/^\+/, ""),
    };
  }
};

const getRejectedMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
};

export default function NewClientScreen() {
  const insets = useSafeAreaInsets();
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { id, returnTo, phoneNumber: initialPhone, contactName } = useLocalSearchParams<{ id?: string; returnTo?: string; phoneNumber?: string; contactName?: string }>();
  const dispatch = useAppDispatch();
  const client = useAppSelector((state) => selectClientById(state, id));
  const clientCreating = useAppSelector(selectClientCreating);
  const clientCreateError = useAppSelector(selectClientCreateError);
  const clientDetailsError = useAppSelector(selectClientDetailsError);
  const clientDetailsLoading = useAppSelector(selectClientDetailsLoading);
  const clientUpdateError = useAppSelector(selectClientUpdateError);
  const clientUpdating = useAppSelector(selectClientUpdating);
  const clientsActiveFilter = useAppSelector(selectClientsActiveFilter);
  const clientsQuery = useAppSelector(selectClientsQuery);
  const hasPrefilledRef = useRef(false);
  const { scrollToFirstError, scrollViewRef, setFieldRef } = useValidationScroll(VALIDATION_FIELD_ORDER);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState(!id && contactName ? splitFullName(contactName).first_name : "");
  const [fieldErrors, setFieldErrors] = useState<ClientFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [lastName, setLastName] = useState(!id && contactName ? splitFullName(contactName).last_name : "");
  const [gender, setGender] = useState<(typeof GENDER_OPTIONS)[number] | "">("");
  const [isFinishing, setIsFinishing] = useState(false);
  const [phone, setPhone] = useState(!id && initialPhone ? (initialPhone.startsWith("+") ? initialPhone : `+${initialPhone}`) : "");
  const [replacingPhone, setReplacingPhone] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>(() => {
    if (!id && initialPhone) {
      try { return parsePhoneNumber(initialPhone.startsWith("+") ? initialPhone : `+${initialPhone}`).country || "IN"; } catch { return "IN"; }
    }
    return "IN";
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [whatsappMatchesPhone, setWhatsappMatchesPhone] = useState(true);
  const [promotionChannels, setPromotionChannels] = useState<string[]>([]);
  const [transactionChannels, setTransactionChannels] = useState(["SMS", "Email", "Whatsapp"]);
  const [birthDate, setBirthDate] = useState("");
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [address, setAddress] = useState("");

  const [moreDetails, setMoreDetails] = useState(false);
  const firstNameInput = useRef<TextInput>(null);
  const lastNameInput = useRef<TextInput>(null);
  const phoneInput = useRef<TextInput>(null);
  const emailInput = useRef<TextInput>(null);
  const addressInput = useRef<TextInput>(null);
  const isEditMode = Boolean(id);
  const keyboardNavigationFields = useMemo(() => [
    { ref: firstNameInput },
    { ref: lastNameInput },
    { ref: phoneInput, disabled: !!id && !replacingPhone },
    { ref: emailInput },
    { ref: addressInput, disabled: !isEditMode || !moreDetails },
  ], [id, replacingPhone, isEditMode, moreDetails]);
  const keyboardNavigation = useMemo(() => ({ fields: keyboardNavigationFields, showAccessory: false }), [keyboardNavigationFields]);


  const isSubmitting = clientCreating || clientUpdating || isFinishing;
  const displayedError = formError ?? (isEditMode ? clientUpdateError : clientCreateError);

  useEffect(() => {
    if (id) {
      void dispatch(fetchClientByIdThunk(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (!hasPrefilledRef.current && client) {
      const existingName = splitFullName(client.fullName);
      const nextPhone = getPhoneForEdit(client.phone, client.phoneCountryCode);
      setFirstName(existingName.first_name);
      setLastName(existingName.last_name);
      setPhone(nextPhone);
      if (nextPhone) {
        try {
          const parsed = parsePhoneNumber(nextPhone);
          if (parsed.country) {
            setPhoneCountry(parsed.country);
          }
        } catch {
          setPhoneCountry("IN");
        }
      }
      setEmail(client.email === "-" ? "" : client.email);
      setBirthDate(client.birthdayDayMonth ? (client.birthdayYear ?? 2000) + "-" + client.birthdayDayMonth : "");
      setAnniversaryDate(client.anniversary ?? "");
      setAddress(client.address ?? "");
      setWhatsappMatchesPhone(client.hasWhatsapp ?? true);
      setTransactionChannels([...(client.smsNotifications !== false ? ["SMS"] : []), ...(client.emailNotifications !== false ? ["Email"] : []), ...(client.whatsappNotifications !== false ? ["Whatsapp"] : [])]);
      setPromotionChannels([...(client.smsMarketing ? ["SMS"] : []), ...(client.emailMarketing ? ["Email"] : []), ...(client.whatsappMarketing ? ["Whatsapp"] : [])]);
      setGender(
        GENDER_OPTIONS.includes(client.gender as (typeof GENDER_OPTIONS)[number])
          ? (client.gender as (typeof GENDER_OPTIONS)[number])
          : "",
      );
      hasPrefilledRef.current = true;
    }
  }, [client]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/clients" as Href);
  };

  const handleSubmit = async () => {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    setFormError(null);
    setSuccessMessage(null);

    const nextErrors: ClientFieldErrors = {};
    if (!trimmedFirstName) nextErrors.firstName = "First name is required.";
    const parsedPhone = isValidPhoneNumber(trimmedPhone) ? parsePhoneNumber(trimmedPhone) : null;
    if (!trimmedPhone) {
      nextErrors.phone = "Phone number is required.";
    } else if (!parsedPhone || parsedPhone.nationalNumber.length !== PHONE_DIGIT_COUNT) {
      nextErrors.phone = PHONE_INVALID_MESSAGE;
    }
    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      nextErrors.email = EMAIL_INVALID_MESSAGE;
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      scrollToFirstError(nextErrors);
      return;
    }

    const phoneParts = splitPhoneForRequest(trimmedPhone);
    const clientPayload = {
      email: trimmedEmail || null,
      first_name: trimmedFirstName,
      ...(gender ? { gender } : {}),
      ...(birthDate ? { birthday_day_month: birthDate.slice(5), birthday_year: client?.birthdayYear == null && birthDate === "2000-" + client?.birthdayDayMonth ? null : Number(birthDate.slice(0, 4)) } : isEditMode ? { birthday_day_month: null, birthday_year: null } : {}),
      ...(anniversaryDate ? { anniversary: anniversaryDate } : isEditMode ? { anniversary: null } : {}),
      address: address.trim() || null,
      has_whatsapp: whatsappMatchesPhone,
      sms_notifications: transactionChannels.includes("SMS"),
      email_notifications: transactionChannels.includes("Email"),
      whatsapp_notifications: transactionChannels.includes("Whatsapp"),
      sms_marketing: promotionChannels.includes("SMS"),
      email_marketing: promotionChannels.includes("Email"),
      whatsapp_marketing: promotionChannels.includes("Whatsapp"),
      last_name: trimmedLastName,
      phone_country_code: phoneParts.phoneCountryCode,
      phone_number: phoneParts.phoneNumber,
    };

    if (id) {
      const resultAction = await dispatch(
        updateClientThunk({ clientId: id, updates: clientPayload }),
      );

      if (updateClientThunk.rejected.match(resultAction)) {
        setFormError(getRejectedMessage(resultAction.payload, "Unable to update client."));
        return;
      }

      setSuccessMessage(resultAction.payload.message ?? "Client updated successfully.");
      setIsFinishing(true);

      setTimeout(() => {
        if (returnTo === "booking") {
          router.replace({ pathname: "/bookings/new", params: { clientId: id } } as Href);
        } else {
          handleBack();
        }
        setIsFinishing(false);
      }, 650);
      return;
    }

    const resultAction = await dispatch(createClientThunk(clientPayload));

    if (createClientThunk.rejected.match(resultAction)) {
      setFormError(getRejectedMessage(resultAction.payload, "Unable to create client."));
      return;
    }

    setSuccessMessage(resultAction.payload.message ?? "Client created successfully.");
    setIsFinishing(true);

    try {
      const refreshArgs = {
        inactive: clientsQuery.inactive,
        limit: clientsQuery.limit,
        offset: 0,
        reset: true,
        search: clientsQuery.search,
        sort_by: clientsQuery.sort_by,
        sort_order: clientsQuery.sort_order,
      };

      if (clientsActiveFilter) {
        await dispatch(filterClientsThunk({ ...refreshArgs, filter: clientsActiveFilter }));
      } else if (clientsQuery.search) {
        await dispatch(searchClientsThunk(refreshArgs));
      } else {
        await dispatch(fetchClientsThunk(refreshArgs));
      }
    } finally {
      setTimeout(() => {
        if (returnTo === "booking") {
          router.replace({ pathname: "/bookings/new", params: { clientId: resultAction.payload.client.id } } as Href);
        } else if (returnTo === "inbox") {
          handleBack();
        } else {
          router.replace(("/clients/" + resultAction.payload.client.id) as Href);
        }
        setIsFinishing(false);
      }, 650);
    }
  };

  if (isEditMode && clientDetailsLoading && !client) {
    return (
      <PearlBackground><SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.primaryText} size="large" />
        </View>
      </SafeAreaView></PearlBackground>
    );
  }

  if (isEditMode && clientDetailsError && !client) {
    return (
      <PearlBackground><SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.loadingState}>
          <Text style={styles.errorText}>{clientDetailsError}</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={handleBack} style={styles.submitButton}>
            <Text translate style={styles.submitButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView></PearlBackground>
    );
  }

  return <PearlBackground><SafeAreaView edges={["top"]} style={styles.safeArea}><AppStatusBar />
    <KeyboardAwareScrollView pearlStyle keyboardNavigation={keyboardNavigation} ref={scrollViewRef} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }} style={styles.flex} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><AppBackButton onPress={handleBack} /><Text translate style={{ flex: 1, textAlign: "center", color: pearl.ink, fontSize: 18, fontWeight: "700" }}>{isEditMode ? "Edit client" : "Add client"}</Text><View style={{ width: 44 }} /></View>
      <View style={formUi.card}><Text translate style={formUi.heading}>Contact</Text><View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}><Text translate style={clientUi.label}>First name *</Text><TextInput ref={(input) => { firstNameInput.current = input; setFieldRef("firstName", input); }} returnKeyType="next" onSubmitEditing={() => lastNameInput.current?.focus()} submitBehavior="submit" editable={!isSubmitting} value={firstName} onChangeText={(value) => { setFirstName(value); setFieldErrors((current) => ({ ...current, firstName: undefined })); }} placeholder="e.g. Ananya" placeholderTextColor={pearl.placeholder} style={clientUi.input} />{fieldErrors.firstName ? <Text style={clientUi.error}>{fieldErrors.firstName}</Text> : null}</View>
        <View style={{ flex: 1 }}><Text translate style={clientUi.label}>Last name</Text><TextInput ref={lastNameInput} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => { if (id && !replacingPhone) emailInput.current?.focus(); else phoneInput.current?.focus(); }} editable={!isSubmitting} value={lastName} onChangeText={setLastName} placeholder="Optional" placeholderTextColor={pearl.placeholder} style={clientUi.input} /></View>
      </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mobile<Text translate style={styles.requiredMark}>*</Text></Text>
              {id && !replacingPhone ? (
                // No "Change number" label: tapping the masked number itself
                // opens the field for a new number.
                <TouchableOpacity
                  accessibilityHint="Opens the field to enter a new number"
                  accessibilityLabel="Replace client phone number"
                  accessibilityRole="button"
                  activeOpacity={0.7}
                  disabled={isSubmitting}
                  onPress={() => { setPhone(""); setReplacingPhone(true); }}
                  style={styles.inputContainer}
                >
                  <Text style={styles.inputLabel}>{maskPhone(phone)}</Text>
                </TouchableOpacity>
              ) : <PhoneInput pearlStyle
                ref={(input) => { phoneInput.current = input; setFieldRef("phone", input); }}
                onSubmitEditing={() => emailInput.current?.focus()}
                country={phoneCountry}
                disabled={isSubmitting}
                error={fieldErrors.phone}
                onChange={(value) => {
                  setPhone(value);
                  setFieldErrors((current) => ({ ...current, phone: undefined }));
                }}
                onCountryChange={setPhoneCountry}
                placeholder="Enter phone number"
                required
                value={phone}
              />}
              <View style={styles.whatsappRow}>
                <Text translate style={styles.whatsappText}>Same number on WhatsApp</Text>
                <Switch onValueChange={setWhatsappMatchesPhone} thumbColor="#FFFFFF" trackColor={{ false: Colors.border, true: Colors.primary }} value={whatsappMatchesPhone} />
              </View>
            </View>

      <View><Text translate style={clientUi.label}>Email</Text><TextInput ref={(input) => { emailInput.current = input; setFieldRef("email", input); }} returnKeyType={isEditMode && moreDetails ? "next" : "done"} onSubmitEditing={() => { if (isEditMode && moreDetails) addressInput.current?.focus(); else Keyboard.dismiss(); }} editable={!isSubmitting} value={email} onChangeText={(value) => { setEmail(value); setFieldErrors((current) => ({ ...current, email: undefined })); }} keyboardType="email-address" autoCapitalize="none" placeholder="Optional" placeholderTextColor={pearl.placeholder} style={clientUi.input} />{fieldErrors.email ? <Text style={clientUi.error}>{fieldErrors.email}</Text> : null}</View></View>
      <View style={formUi.card}><Text translate style={formUi.heading}>Messages</Text><Text translate style={clientUi.muted}>Ask the client before turning promotions on.</Text>{[
        { title: "Bills & reminders", hint: "WhatsApp · SMS", enabled: transactionChannels.length > 0, toggle: () => setTransactionChannels(transactionChannels.length ? [] : ["SMS", "Whatsapp"]) },
        { title: "Offers & promotions", hint: "Off until the client agrees", enabled: promotionChannels.length > 0, toggle: () => setPromotionChannels(promotionChannels.length ? [] : ["SMS", "Whatsapp"]) },
      ].map((row) => <View key={row.title} style={formUi.toggleRow}><View style={{ flex: 1 }}><Text translate style={clientUi.rowTitle}>{row.title}</Text><Text style={clientUi.muted}>{row.hint}</Text></View><Switch disabled={isSubmitting} value={row.enabled} onValueChange={row.toggle} thumbColor="#FFFFFF" trackColor={{ false: pearl.divider, true: pearl.accent }} /></View>)}</View>
      {isEditMode ? <TouchableOpacity onPress={() => setMoreDetails((value) => !value)} style={[formUi.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}><View style={clientUi.icon}><Ionicons name="person-outline" size={19} color={pearlTones.lilac.fg} /></View><View style={{ flex: 1 }}><Text translate style={clientUi.rowTitle}>More details (optional)</Text><Text translate style={clientUi.muted}>Gender, birthday, anniversary, address</Text></View><Ionicons name={moreDetails ? "chevron-up" : "chevron-down"} size={17} color={pearl.muted} /></TouchableOpacity> : null}
      {!isEditMode || moreDetails ? <View style={formUi.card}>{isEditMode ? <><Text translate style={formUi.heading}>More details</Text><View><Text translate style={clientUi.label}>Gender</Text><ClientChips options={GENDER_OPTIONS} selected={gender} onSelect={(value) => setGender(value as (typeof GENDER_OPTIONS)[number])} /></View></> : null}
        <DateField pearlStyle ref={(view) => setFieldRef("birthDate", view)} error={fieldErrors.birthDate} label="Birthday (optional)" maximumDate={new Date()} value={birthDate} onChange={(value) => { setBirthDate(value); setFieldErrors((current) => ({ ...current, birthDate: undefined })); }} placeholder="Select birthday" />
        <DateField pearlStyle ref={(view) => setFieldRef("anniversary", view)} error={fieldErrors.anniversary} label="Anniversary (optional)" maximumDate={new Date()} value={anniversaryDate} onChange={(value) => { setAnniversaryDate(value); setFieldErrors((current) => ({ ...current, anniversary: undefined })); }} placeholder="Select anniversary" />
        {isEditMode ? <View><Text translate style={clientUi.label}>Address</Text><TextInput ref={addressInput} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} editable={!isSubmitting} value={address} onChangeText={setAddress} placeholder="Optional" placeholderTextColor={pearl.placeholder} style={clientUi.input} /></View> : null}
      </View> : null}
      <Text translate style={clientUi.muted}>Only first name and mobile are required. Everything else can be added later.</Text>
      {displayedError ? <Text accessibilityRole="alert" style={clientUi.error}>{displayedError}</Text> : null}{successMessage ? <Text style={{ color: pearl.successText }}>{successMessage}</Text> : null}
    </KeyboardAwareScrollView>
    <PearlActionFooter bottomInset={insets.bottom}><ClientButton secondary label="Cancel" loading={isSubmitting} onPress={handleBack} /><View style={{ flex: 1 }}><ClientButton label="Save client" loading={isSubmitting} onPress={() => void handleSubmit()} /></View></PearlActionFooter>
  </SafeAreaView></PearlBackground>;
}
const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: Colors.appointmentBackground,
    flex: 1,
  },
  loadingState: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.lg,
    justifyContent: "center",
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 7,
  },
  inputContainer: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 52,
    paddingHorizontal: AppLayout.searchBarPaddingX,
  },
  whatsappRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  whatsappText: {
    color: Colors.text2,
    fontSize: 13,
  },
  errorText: {
    color: Colors.error,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginLeft: Spacing.sm,
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: AppRadius.pill,
    flex: 1.3,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: AppLayout.cardPadding,
  },
  submitButtonText: {
    color: Colors.onPrimary,
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 0,
  },
  requiredMark: {
    color: Colors.primaryText,
  },
});

const formUi = StyleSheet.create({ card: { padding: 16, gap: 14, borderRadius: 28, backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder }, heading: { color: pearl.ink, fontSize: 16, fontWeight: "700" }, toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52 } });
