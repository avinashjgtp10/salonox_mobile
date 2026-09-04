import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { isValidPhoneNumber, parsePhoneNumber, type CountryCode } from "libphonenumber-js";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { DateField } from "@/components/ui/DateField";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
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
import { useThemeColors } from "@/theme/ThemeProvider";
import { EMAIL_INVALID_MESSAGE, isValidEmail, PHONE_DIGIT_COUNT, PHONE_INVALID_MESSAGE } from "@/utils/validation";
import { splitFullName } from "@/utils/name";
import { useValidationScroll } from "@/hooks/useValidationScroll";

const GENDER_OPTIONS = ["Female", "Male", "Other"] as const;
const STATE_OPTIONS = ["Andhra Pradesh", "Delhi", "Gujarat", "Karnataka", "Maharashtra", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal"];
const LEAD_SOURCE_OPTIONS = ["Walk-in", "Google", "Instagram", "Facebook", "Referral", "Website", "Other"];

type ClientField = "email" | "firstName" | "phone";
type ClientFieldErrors = Partial<Record<ClientField, string>>;
const VALIDATION_FIELD_ORDER: ClientField[] = ["firstName", "phone", "email"];

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

function DinggSelect({ label, onSelect, options, placeholder = "Select", value }: { label?: string; onSelect: (value: string) => void; options: readonly string[]; placeholder?: string; value: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.selectGroup}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <TouchableOpacity activeOpacity={0.84} onPress={() => setVisible(true)} style={styles.inputContainer}>
        <Text style={[styles.selectText, !value && styles.placeholderText]}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={17} color={Colors.appointmentTextSecondary} />
      </TouchableOpacity>
      <Modal animationType="fade" onRequestClose={() => setVisible(false)} transparent visible={visible}>
        <Pressable onPress={() => setVisible(false)} style={styles.selectBackdrop}>
          <Pressable style={styles.selectModal}>
            <TextInput placeholder="Search" placeholderTextColor={Colors.appointmentPlaceholder} style={styles.selectSearch} />
            <ScrollView keyboardShouldPersistTaps="handled">
              {options.map((option) => (
                <TouchableOpacity key={option} onPress={() => { onSelect(option); setVisible(false); }} style={styles.selectOption}>
                  <Text style={styles.selectOptionText}>{option}</Text>
                  {option === value ? <Ionicons name="checkmark" size={18} color={Colors.appointmentAccent} /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

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
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { id, returnTo } = useLocalSearchParams<{ id?: string; returnTo?: string }>();
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
  const [firstName, setFirstName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ClientFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<(typeof GENDER_OPTIONS)[number] | "">("");
  const [isFinishing, setIsFinishing] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>("IN");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [whatsappMatchesPhone, setWhatsappMatchesPhone] = useState(true);
  const [promotionChannels, setPromotionChannels] = useState(["SMS", "Email", "Whatsapp"]);
  const [transactionChannels, setTransactionChannels] = useState(["SMS", "Email", "Whatsapp"]);
  const [birthDate, setBirthDate] = useState("");
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [address, setAddress] = useState("");
  const [clientCode, setClientCode] = useState("");
  const [clientState, setClientState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [customerReferral, setCustomerReferral] = useState(false);
  const [sourceDescription, setSourceDescription] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [identificationNumber, setIdentificationNumber] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [creditDuration, setCreditDuration] = useState("");

  const toggleChannel = (channel: string, transaction = false) => {
    const setter = transaction ? setTransactionChannels : setPromotionChannels;
    setter((current) => current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]);
  };

  const isEditMode = Boolean(id);
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
      ...(trimmedEmail ? { email: trimmedEmail } : {}),
      first_name: trimmedFirstName,
      ...(gender ? { gender } : {}),
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
        } else {
          handleBack();
        }
        setIsFinishing(false);
      }, 650);
    }
  };

  if (isEditMode && clientDetailsLoading && !client) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (isEditMode && clientDetailsError && !client) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.loadingState}>
          <Text style={styles.errorText}>{clientDetailsError}</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={handleBack} style={styles.submitButton}>
            <Text style={styles.submitButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />
      <KeyboardAwareScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.flex}
      >
          <View style={styles.headerRow}>
            <AppBackButton onPress={handleBack} />
            <Text style={styles.headerTitle}>{isEditMode ? "Edit client" : "Add client"}</Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>

            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <Text style={styles.inputLabel}>First Name<Text style={styles.requiredMark}>*</Text></Text>
                <View style={[styles.inputContainer, fieldErrors.firstName && styles.inputContainerError]}>
                  <TextInput ref={(input) => setFieldRef("firstName", input)} autoCapitalize="words" editable={!isSubmitting} onChangeText={(value) => { setFirstName(value); setFieldErrors((current) => ({ ...current, firstName: undefined })); }} placeholder="First name" placeholderTextColor={Colors.appointmentPlaceholder} returnKeyType="next" style={styles.textInput} textContentType="givenName" value={firstName} />
                </View>
                {fieldErrors.firstName ? <Text style={styles.fieldErrorText}>{fieldErrors.firstName}</Text> : null}
              </View>
              <View style={styles.nameField}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <View style={styles.inputContainer}>
                  <TextInput autoCapitalize="words" editable={!isSubmitting} onChangeText={setLastName} placeholder="Last name" placeholderTextColor={Colors.appointmentPlaceholder} returnKeyType="next" style={styles.textInput} textContentType="familyName" value={lastName} />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mobile No.<Text style={styles.requiredMark}>*</Text></Text>
              <PhoneInput
                ref={(input) => setFieldRef("phone", input)}
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
              />
              <View style={styles.whatsappRow}>
                <Text style={styles.whatsappText}>This is Client&apos;s <Text style={styles.whatsappAccent}>WhatsApp</Text> Number</Text>
                <Switch onValueChange={setWhatsappMatchesPhone} thumbColor="#FFFFFF" trackColor={{ false: Colors.appointmentBorder, true: Colors.appointmentAccent }} value={whatsappMatchesPhone} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={[styles.inputContainer, fieldErrors.email && styles.inputContainerError]}>
                <TextInput
                  ref={(input) => setFieldRef("email", input)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  keyboardType="email-address"
                  onChangeText={(value) => { setEmail(value); setFieldErrors((current) => ({ ...current, email: undefined })); }}
                  placeholder="Enter email address"
                  placeholderTextColor={Colors.appointmentPlaceholder}
                  returnKeyType="next"
                  style={styles.textInput}
                  textContentType="emailAddress"
                  value={email}
                />
              </View>
              {fieldErrors.email ? <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text> : null}
            </View>

            <View style={styles.communicationBlock}>
              <Text style={styles.subsectionTitle}>Communication Preference</Text>
              {(["Promotion", "Transaction"] as const).map((group) => {
                const selected = group === "Promotion" ? promotionChannels : transactionChannels;
                return (
                  <View key={group} style={styles.preferenceGroup}>
                    <Text style={styles.inputLabel}>{group}</Text>
                    <View style={styles.preferenceRow}>
                      {["SMS", "Email", "Whatsapp"].map((channel) => (
                        <TouchableOpacity key={`${group}-${channel}`} onPress={() => toggleChannel(channel, group === "Transaction")} style={styles.preferenceOption}>
                          <Ionicons name={selected.includes(channel) ? "checkbox" : "square-outline"} size={20} color={selected.includes(channel) ? Colors.appointmentAccent : Colors.appointmentMuted} />
                          <Text style={styles.preferenceText}>{channel}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>

          </View>

          <View style={styles.formCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Additional Information</Text>
            </View>
            <DinggSelect label="Gender*" onSelect={(value) => setGender(value as (typeof GENDER_OPTIONS)[number])} options={GENDER_OPTIONS} value={gender} />
            <DateField
              label="Date of birth"
              maximumDate={new Date()}
              onChange={setBirthDate}
              placeholder="Select date of birth"
              value={birthDate}
            />
            <DateField
              label="Anniversary"
              maximumDate={new Date()}
              onChange={setAnniversaryDate}
              placeholder="Select anniversary date"
              value={anniversaryDate}
            />
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Address</Text><View style={[styles.inputContainer, styles.multilineInput]}><TextInput multiline onChangeText={setAddress} placeholder="Address" placeholderTextColor={Colors.appointmentPlaceholder} style={styles.textInput} value={address} /></View></View>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Client Code</Text><View style={styles.inputContainer}><TextInput onChangeText={setClientCode} placeholder="Enter client code" placeholderTextColor={Colors.appointmentPlaceholder} style={styles.textInput} value={clientCode} /></View></View>
            <DinggSelect label="State" onSelect={setClientState} options={STATE_OPTIONS} placeholder="Select State" value={clientState} />
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>ZIP / PIN Code</Text><View style={styles.inputContainer}><TextInput keyboardType="number-pad" onChangeText={setPostalCode} placeholder="ZIP / PIN Code" placeholderTextColor={Colors.appointmentPlaceholder} style={styles.textInput} value={postalCode} /></View></View>
            <DinggSelect label="Lead Source" onSelect={setLeadSource} options={LEAD_SOURCE_OPTIONS} value={leadSource} />
            <View style={styles.switchField}><Text style={styles.inputLabel}>Customer Referral</Text><Switch onValueChange={setCustomerReferral} thumbColor="#FFFFFF" trackColor={{ false: Colors.appointmentBorder, true: Colors.appointmentAccent }} value={customerReferral} /></View>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Source Description</Text><View style={[styles.inputContainer, styles.multilineInput]}><TextInput multiline onChangeText={setSourceDescription} placeholder="Source Description" placeholderTextColor={Colors.appointmentPlaceholder} style={styles.textInput} value={sourceDescription} /></View></View>
            <Text style={styles.subsectionTitle}>Tax Details</Text>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>GST Number</Text><View style={styles.inputContainer}><TextInput autoCapitalize="characters" onChangeText={setGstNumber} placeholder="GST Number" placeholderTextColor={Colors.appointmentPlaceholder} style={styles.textInput} value={gstNumber} /></View></View>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Identification No.</Text><View style={styles.inputContainer}><TextInput onChangeText={setIdentificationNumber} placeholder="Identification No." placeholderTextColor={Colors.appointmentPlaceholder} style={styles.textInput} value={identificationNumber} /></View></View>

          </View>

          <View style={styles.formCard}>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Financial Information</Text></View>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Credit Limit</Text><View style={styles.inputContainer}><TextInput keyboardType="decimal-pad" onChangeText={setCreditLimit} placeholder="Credit Limit" placeholderTextColor={Colors.appointmentPlaceholder} style={styles.textInput} value={creditLimit} /></View></View>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Credit Duration</Text><View style={styles.inputContainer}><TextInput keyboardType="number-pad" onChangeText={setCreditDuration} placeholder="Credit Duration (days)" placeholderTextColor={Colors.appointmentPlaceholder} style={styles.textInput} value={creditDuration} /></View></View>
          </View>

          {displayedError ? (
              <View style={styles.errorContainer} accessibilityRole="alert">
                <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
                <Text style={styles.errorText}>{displayedError}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successContainer} accessibilityRole="alert">
                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.success} />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

      </KeyboardAwareScrollView>
      <View style={styles.bottomActions}>
        <TouchableOpacity activeOpacity={0.82} disabled={isSubmitting} onPress={handleBack} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.88} disabled={isSubmitting} onPress={handleSubmit} style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}>
          {isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
          <Text style={styles.submitButtonText}>{isSubmitting ? "Saving..." : "Save"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: Colors.appointmentBackground,
    flex: 1,
  },
  content: {
    paddingBottom: 120,
    paddingHorizontal: 16,
    paddingTop: Spacing.sm,
  },
  loadingState: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.lg,
    justifyContent: "center",
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
    minHeight: 58,
  },
  backButtonPlaceholder: {
    width: AppLayout.headerActionSize,
  },
  headerTitle: {
    color: Colors.appointmentText,
    fontFamily: "serif",
    fontSize: 28,
    fontWeight: "700",
  },
  formCard: {
    backgroundColor: Colors.appointmentSurfaceMuted,
    borderColor: Colors.appointmentDivider,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 18,
    padding: 12,
  },
  iconWrap: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    height: 56,
    justifyContent: "center",
    marginBottom: Spacing.xl,
    width: 56,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: Colors.appointmentTextSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 7,
  },
  inputContainer: {
    alignItems: "center",
    backgroundColor: Colors.appointmentSurface,
    borderColor: Colors.appointmentBorder,
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 52,
    paddingHorizontal: AppLayout.searchBarPaddingX,
  },
  inputContainerError: {
    borderColor: Colors.error,
    borderWidth: 1.5,
  },
  fieldErrorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  textInput: {
    color: Colors.appointmentText,
    flex: 1,
    fontSize: 15,
    minHeight: 50,
  },
  placeholderText: {
    color: Colors.appointmentPlaceholder,
  },
  selectGroup: {
    flex: 1,
    marginBottom: 16,
  },
  selectText: {
    color: Colors.appointmentText,
    flex: 1,
    fontSize: 15,
  },
  selectBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.46)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  selectModal: {
    backgroundColor: Colors.appointmentSurface,
    borderRadius: 8,
    maxHeight: "82%",
    padding: 16,
    width: "100%",
  },
  selectSearch: {
    borderColor: Colors.appointmentBorder,
    borderRadius: 7,
    borderWidth: 1,
    color: Colors.appointmentText,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  selectOption: {
    alignItems: "center",
    borderBottomColor: Colors.appointmentDivider,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
  },
  selectOptionText: {
    color: Colors.appointmentText,
    flex: 1,
    fontSize: 15,
  },
  whatsappRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  whatsappText: {
    color: Colors.appointmentTextSecondary,
    fontSize: 13,
  },
  whatsappAccent: {
    color: Colors.success,
    fontWeight: "700",
  },
  communicationBlock: {
    borderTopColor: Colors.appointmentBorder,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  subsectionTitle: {
    color: Colors.appointmentText,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 14,
  },
  preferenceGroup: {
    marginBottom: 12,
  },
  preferenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  preferenceOption: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    minHeight: 32,
  },
  preferenceText: {
    color: Colors.appointmentText,
    fontSize: 13,
  },
  multilineInput: {
    alignItems: "flex-start",
    minHeight: 88,
  },
  switchField: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  genderRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  genderChip: {
    alignItems: "center",
    backgroundColor: Colors.appointmentSurface,
    borderColor: Colors.appointmentBorder,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  genderChipSelected: {
    backgroundColor: Colors.appointmentAccent,
    borderColor: Colors.appointmentAccent,
  },
  genderChipText: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "800",
  },
  genderChipTextSelected: {
    color: "#FFFFFF",
  },
  errorContainer: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderColor: Colors.errorBorder,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  errorText: {
    color: Colors.error,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginLeft: Spacing.sm,
  },
  successContainer: {
    alignItems: "center",
    backgroundColor: Colors.successBg,
    borderColor: Colors.successBorder,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  successText: {
    color: Colors.success,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginLeft: Spacing.sm,
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: Colors.appointmentAccent,
    borderRadius: AppRadius.pill,
    flex: 1.3,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: AppLayout.cardPadding,
  },
  submitButtonDisabled: {
    opacity: 0.72,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 0,
  },
  sectionHeader: {
    borderBottomColor: Colors.appointmentBorder,
    borderBottomWidth: 1,
    marginBottom: 20,
    paddingBottom: 14,
  },
  sectionTitle: {
    color: Colors.appointmentText,
    fontSize: 16,
    fontWeight: "900",
  },
  nameRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
  },
  nameField: {
    flex: 1,
    minWidth: 0,
  },
  requiredMark: {
    color: Colors.appointmentAccent,
  },
  countryCode: {
    color: Colors.appointmentText,
    fontSize: 14,
    fontWeight: "800",
    marginRight: 10,
  },
  bottomActions: {
    alignItems: "center",
    backgroundColor: Colors.appointmentSurface,
    borderTopColor: Colors.appointmentDivider,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  cancelButton: {
    alignItems: "center",
    flex: 0.9,
    justifyContent: "center",
    minHeight: 58,
  },
  cancelButtonText: {
    color: Colors.appointmentText,
    fontSize: 16,
    fontWeight: "900",
  },
});
