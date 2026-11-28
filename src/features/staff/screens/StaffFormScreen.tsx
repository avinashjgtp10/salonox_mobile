import { useCallback, useEffect, useMemo, useRef, useState, createRef } from "react";
import { AppSwitch } from "@/components/ui/AppSwitch";
import { Keyboard, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Text, TextInput } from "@/components/ui/AppTypography";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { DateField } from "@/components/ui/DateField";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { PasswordField } from "@/components/ui/PasswordField";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { KeyboardInsetView } from "@/components/ui/KeyboardInsetView";
import { PearlActionFooter } from "@/components/ui/PearlActionFooter";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl } from "@/components/auth/pearl/themedPearl";
import { appAlert as Alert } from "@/services/appAlert";
import { getApiErrorMessage } from "@/services/api";
import { authService } from "@/services/authService";
import { useValidationScroll } from "@/hooks/useValidationScroll";
import { STAFF_ROLE_OPTIONS } from "../validation/staff.validation";
import { useStaffForm } from "../hooks/useStaffForm";
import { useStaffDetails } from "../hooks/useStaffDetails";
import {
  StaffAvatar,
  StaffButton,
  StaffHeader,
  StaffMenuItem,
  staffUi,
} from "../components/StaffPearl";
import { StaffTextField } from "../components/StaffTextField";
import { StaffFormPermissions } from "../components/StaffFormPermissions";
import { StaffTimeField } from "../components/StaffTimeField";
import { STAFF_PAY_TYPE_OPTIONS } from "../types/staffFeature.types";
import type { StaffProfileFormValues } from "../types/staffFeature.types";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { canManageStaffLifecycle } from "@/utils/userProfile";
import type { CountryCode } from "libphonenumber-js";
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const AVATAR_SIZE_ERROR_MESSAGE = "Profile image must be 2 MB or smaller.";
const AVATAR_TYPE_ERROR_MESSAGE =
  "Unsupported file type. Please choose a PNG, JPG, or GIF image.";
const ACCEPTED_AVATAR_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
]);

type StaffValidationField = keyof StaffProfileFormValues;
const VALIDATION_FIELD_ORDER: StaffValidationField[] = [
  "payType",
  "fullName",
  "email",
  "phone",
  "dob",
  "joiningDate",
  "address",
  "startTime",
  "endTime",
  "gender",
  "designation",
  "hourlyRate",
  "fixedSalary",
  "workingHoursPerDay",
  "password",
  "confirmPassword",
];

const sanitizeDecimalInput = (text: string) => {
  const cleaned = text.replace(/[^0-9.]/g, "");
  const firstDotIndex = cleaned.indexOf(".");

  if (firstDotIndex === -1) {
    return cleaned;
  }

  return (
    cleaned.slice(0, firstDotIndex + 1) +
    cleaned.slice(firstDotIndex + 1).replace(/\./g, "")
  );
};

const guessMimeTypeFromUri = (uri: string) => {
  const extension = uri.split("?")[0].split(".").pop()?.toLowerCase();

  if (extension === "png") return "image/png";
  if (extension === "gif") return "image/gif";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";

  return "";
};

const getInitials = (fullName: string) =>
  fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "S";

const getAssetSizeBytes = async (
  uri: string,
  fileSize?: number | null,
): Promise<number | null> => {
  if (typeof fileSize === "number" && Number.isFinite(fileSize)) {
    return fileSize;
  }

  try {
    const response = await fetch(uri);
    const blob = await response.blob();

    return blob.size;
  } catch {
    return null;
  }
};

// Two-step wizard per the prototype: step 1 is the staff profile (both the
// required sub-section and the optional "more about this person" one); step 2
// is Access level + permissions + login, with login now always required.
const STEP_FIELDS: (keyof StaffProfileFormValues)[][] = [
  [
    "fullName", "phone", "designation",
    "startTime", "endTime", "joiningDate",
    "dob", "gender", "payType", "address",
    "fixedSalary", "hourlyRate", "workingHoursPerDay",
  ],
  ["roleLevel", "email", "password", "confirmPassword"],
];
export function StaffFormScreen({ mode }: { mode: "create" | "edit" }) {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; step?: string }>();
  const staffId = mode === "edit" ? params.id : null;
  const form = useStaffForm(staffId);
  useStaffDetails(staffId);
  const currentUser = useAppSelector(selectCurrentUser);
  const [step, setStep] = useState(params.step === "2" || params.step === "3" ? 1 : 0),
    [picker, setPicker] = useState<"designation" | "gender" | null>(null),
    [stepError, setStepError] = useState(""),
    [avatarValidationError, setAvatarValidationError] = useState<string | null>(
      null,
    );
  const [permissionOverrides, setPermissionOverrides] = useState<Record<string, boolean>>({});
  // ── Login email verification ──────────────────────────────────────────────
  // Mirrors the web Add Staff page: with login on, the address is proved by a
  // one-time code before it can be saved as a way into the salon's account.
  // An address already on file counts as proved; editing it needs a new code.
  const [emailOtp, setEmailOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [otpError, setOtpError] = useState("");
  const verifiedEmail = useRef("");
  const loginEmail = form.values.email.trim();
  const needsEmailOtp =
    form.values.isLoginEnabled && loginEmail !== "" && loginEmail !== verifiedEmail.current;
  const savedEmail = form.staffMember?.email;
  useEffect(() => {
    if (mode === "edit" && savedEmail && savedEmail !== "-") {
      verifiedEmail.current = savedEmail;
    }
  }, [mode, savedEmail]);
  const resetOtp = useCallback(() => {
    setEmailOtp("");
    setOtpSent(false);
    setOtpBusy(false);
    setOtpMessage("");
    setOtpError("");
  }, []);
  const sendLoginOtp = async () => {
    if (!loginEmail || otpBusy) return;
    setOtpBusy(true);
    setOtpError("");
    setOtpMessage("");
    try {
      const result = await authService.sendEmailOtp({ email: loginEmail });
      setOtpSent(true);
      setOtpMessage(result.message);
    } catch (e) {
      setOtpError(getApiErrorMessage(e));
    } finally {
      setOtpBusy(false);
    }
  };
  const verifyLoginOtp = async () => {
    const code = emailOtp.trim();
    if (!code || otpBusy) {
      if (!code) setOtpError("Enter the code we sent.");
      return;
    }
    setOtpBusy(true);
    setOtpError("");
    try {
      await authService.verifyEmailOtp({ email: loginEmail, otp: code });
      verifiedEmail.current = loginEmail;
      setOtpMessage("Login email verified.");
      setOtpSent(false);
      setEmailOtp("");
      setStepError("");
    } catch (e) {
      setOtpError(getApiErrorMessage(e));
    } finally {
      setOtpBusy(false);
    }
  };
  const [permissionsReady, setPermissionsReady] = useState(false);
  const { scrollToFirstError, scrollViewRef, setFieldRef } =
    useValidationScroll(VALIDATION_FIELD_ORDER);
  const refs = useMemo(
    () =>
      Object.fromEntries(
        VALIDATION_FIELD_ORDER.map((field) => [field, createRef<TextInput>()]),
      ) as Record<
        keyof StaffProfileFormValues,
        ReturnType<typeof createRef<TextInput>>
      >,
    [],
  );

  const navigation = useMemo(
    () => ({
      showAccessory: false,
      fields: STEP_FIELDS[step].flatMap((field) => [
        {
          ref: refs[field],
          disabled:
            ["dob", "joiningDate", "roleLevel", "gender", "startTime", "endTime", "payType"].includes(field) || (field === "hourlyRate" && form.values.payType !== "Hourly") || (field === "fixedSalary" && form.values.payType !== "Fixed salary"),
        },
      ]),
    }),
    [refs, step, form.values.payType],
  );
  useEffect(() => {
    if (mode === "create" && !form.values.joiningDate) {
      const date = new Date();
      form.updateField(
        "joiningDate",
        [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0"),
        ].join("-"),
      );
    }
  }, [mode, form]);
  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      Keyboard.dismiss();
    } else if (router.canGoBack()) router.back();
    else router.replace("/team" as Href);
  };
  const uploadPickedAsset = async (result: ImagePicker.ImagePickerResult) => {
    const asset = result.canceled ? undefined : result.assets?.[0];

    if (!asset?.uri) {
      return;
    }

    const mimeType = (
      asset.mimeType || guessMimeTypeFromUri(asset.uri)
    ).toLowerCase();

    if (!ACCEPTED_AVATAR_MIME_TYPES.has(mimeType)) {
      setAvatarValidationError(AVATAR_TYPE_ERROR_MESSAGE);
      return;
    }

    const sizeBytes = await getAssetSizeBytes(asset.uri, asset.fileSize);

    if (sizeBytes != null && sizeBytes > MAX_AVATAR_SIZE_BYTES) {
      setAvatarValidationError(AVATAR_SIZE_ERROR_MESSAGE);
      return;
    }

    setAvatarValidationError(null);
    await form.uploadAvatar({
      fileName: asset.fileName,
      mimeType,
      uri: asset.uri,
    });
  };

  const pickAvatarFromSource = async (source: "camera" | "library") => {
    setAvatarValidationError(null);

    try {
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            "Camera access needed",
            "Enable camera access in settings to take a photo.",
          );
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          mediaTypes: ["images"],
          quality: 0.7,
        });

        await uploadPickedAsset(result);
        return;
      }

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Photo access needed",
          "Enable photo library access in settings to choose a photo.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ["images"],
        quality: 0.7,
      });

      await uploadPickedAsset(result);
    } catch (pickerError) {
      Alert.alert("Something went wrong", getApiErrorMessage(pickerError));
    }
  };

  const handlePickAvatar = () => {
    if (form.avatarUploading) {
      return;
    }

    const options: {
      onPress?: () => void;
      style?: "cancel" | "destructive";
      text: string;
    }[] = [
      {
        onPress: () => void pickAvatarFromSource("camera"),
        text: "Take Photo",
      },
      {
        onPress: () => void pickAvatarFromSource("library"),
        text: "Choose from Library",
      },
    ];

    if (form.values.avatarUrl) {
      options.push({
        onPress: () => {
          setAvatarValidationError(null);
          form.removeAvatar();
        },
        style: "destructive",
        text: "Remove Photo",
      });
    }

    options.push({ style: "cancel", text: "Cancel" });

    Alert.alert(
      "Profile Photo",
      "Add a profile photo for this staff member",
      options,
    );
  };

  const field = (
    key: keyof StaffProfileFormValues,
    label: string,
    placeholder = "Optional",
    numeric = false,
  ) => (
    <StaffTextField
      key={key}
      ref={(input) => {
        refs[key].current = input;
        setFieldRef(key, input);
      }}
      label={label}
      value={String(form.values[key])}
      error={key === "email" && step === 0 && !form.values.email.trim() ? undefined : form.validationErrors[key] || (stepError ? form.allValidationErrors[key] : undefined)}
      editable={!form.submitting}
      placeholder={placeholder}
      keyboardType={
        numeric ? "decimal-pad" : key === "email" ? "email-address" : "default"
      }
      autoCapitalize={key === "email" ? "none" : "sentences"}
      returnKeyType="next"
      submitBehavior="submit"
      onSubmitEditing={() => {
        const fields = navigation.fields.filter((f) => !f.disabled),
          index = fields.findIndex((f) => f.ref === refs[key]);
        const next = fields[index + 1]?.ref.current;
        if (next) next.focus();
        else Keyboard.dismiss();
      }}
      onChangeText={(value) =>
        form.updateField(
          key,
          numeric ? sanitizeDecimalInput(value) : (value as never),
        )
      }
    />
  );
  const next = () => {
    setStepError("");
    const errorKey = STEP_FIELDS[step].find(
      (key) => form.allValidationErrors[key],
    );
    if (errorKey) {
      setStepError(form.allValidationErrors[errorKey]);
      scrollToFirstError(Object.fromEntries(STEP_FIELDS[step].filter(key => form.allValidationErrors[key]).map(key => [key, form.allValidationErrors[key]])));
      return;
    }
    Keyboard.dismiss();
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    setStep(step + 1);
  };
  const submit = () => {
    // The login email has to be proved before it becomes a way in, same as the
    // web's Add Staff page. Only when login is on and the address has changed.
    if (needsEmailOtp) {
      setStep(1);
      setStepError(
        otpSent
          ? "Enter the code sent to the login email to verify it."
          : "Verify the login email before saving.",
      );
      return;
    }
    const errors = Object.keys(
      form.allValidationErrors,
    ) as (keyof StaffProfileFormValues)[];
    if (errors.length) {
      const index = STEP_FIELDS.findIndex((fields) =>
        fields.includes(errors[0]),
      );
      setStep(Math.max(0, index));
      setStepError(form.allValidationErrors[errors[0]]);
      return;
    }
    void form.submit(permissionOverrides);
  };
  return (
    <PearlBackground>
      <SafeAreaView edges={["top"]} style={staffUi.screen}>
        <AppStatusBar />
        <KeyboardInsetView bottomOffset={insets.bottom}>
          <KeyboardAwareScrollView
            pearlStyle
            padForKeyboard={false}
            extraScrollPadding={48}
            keyboardNavigation={navigation}
            ref={scrollViewRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[staffUi.content, { paddingBottom: 24 }]}
          >
            <StaffHeader
              centered
              title={mode === "edit" ? "Edit staff" : "Add staff"}
              onBack={handleBack}
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
              {["Staff details", "Permissions & login"].map((label, index) => (
                <View
                  key={label}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor:
                        index <= step ? pearl.accent : pearl.divider,
                    }}
                  />
                  <Text translate
                    style={{
                      color: index <= step ? pearl.accentDeep : pearl.muted,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {index + 1}. {label}
                  </Text>
                </View>
              ))}
            </View>
            {step === 0 ? (
              <>
                <View style={staffUi.formCard}>
                  <Text translate style={staffUi.heading}>Staff details · Required</Text>
                  {field("fullName", "Full name *", "e.g. Shubham Verma")}
                  <View>
                    <Text translate style={staffUi.label}>Mobile *</Text>
                    <PhoneInput
                      pearlStyle
                      ref={(input) => {
                        refs.phone.current = input;
                        setFieldRef("phone", input);
                      }}
                      required
                      placeholder="98765 43210"
                      country={form.values.phoneCountry as CountryCode}
                      disabled={form.submitting}
                      error={form.validationErrors.phone || (stepError ? form.allValidationErrors.phone : undefined)}
                      onCountryChange={(value) =>
                        form.updateField("phoneCountry", value)
                      }
                      value={form.values.phone}
                      onChange={(value) => form.updateField("phone", value)}
                      onSubmitEditing={() => refs.designation.current?.focus()}
                    />
                  </View>
                  {field("designation", "Designation", "Optional")}
                </View>
                <View style={staffUi.formCard}>
                  <Text translate style={staffUi.heading}>Working hours</Text>
                  <Text style={staffUi.muted}>Leave both times blank for no new shifts. Set individual days in Scheduled Shifts.</Text>
                  {(["startTime", "endTime"] as const).map((key) => (
                    <View key={key} ref={(view) => setFieldRef(key, view)}>
                      <StaffTimeField
                        label={key === "startTime" ? "Start Time" : "End Time"}
                        value={form.values[key]}
                        onChange={(value) => form.updateField(key, value)}
                        disabled={form.submitting || !form.canSetShiftHours}
                        error={form.validationErrors[key] || (stepError ? form.allValidationErrors[key] : undefined)}
                      />
                    </View>
                  ))}
                    <View style={{ flex: 1 }}>
                      {" "}
                      <DateField
                        pearlStyle
                        label="Joined on"
                        value={form.values.joiningDate}
                        maximumDate={new Date()}
                        onChange={(value) =>
                          form.updateField("joiningDate", value)
                        }
                        error={form.validationErrors.joiningDate || (stepError ? form.allValidationErrors.joiningDate : undefined)}
                      />
                    </View>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    alignItems: "center",
                    paddingVertical: 6,
                  }}
                >
                  <StaffAvatar
                    initials={getInitials(form.values.fullName)}
                    uri={form.values.avatarUrl}
                    size={56}
                  />
                  <View style={{ flex: 1 }}>
                    <Text translate style={staffUi.rowTitle}>Profile photo</Text>
                    <Text translate style={staffUi.muted}>PNG or JPG, up to 2 MB</Text>
                  </View>
                  <StaffButton
                    secondary
                    label={form.avatarUploading ? "Uploading…" : "Upload"}
                    onPress={handlePickAvatar}
                    disabled={form.avatarUploading}
                  />
                </View>
                {avatarValidationError || form.avatarError ? (
                  <Text style={staffUi.error}>
                    {avatarValidationError ?? form.avatarError}
                  </Text>
                ) : null}
                <View style={staffUi.formCard}>
                  <Text translate style={staffUi.heading}>More about this person · Optional</Text>
                  {field("email", "Personal email", "Optional")}
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      {" "}
                      <DateField
                        pearlStyle
                        label="Date of birth"
                        value={form.values.dob}
                        maximumDate={new Date()}
                        onChange={(value) => form.updateField("dob", value)}
                        error={form.validationErrors.dob}
                      />
                    </View>

                  </View>
                                    <View style={{ flexDirection: "row", gap: 12 }}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setPicker("gender")}><Text translate style={staffUi.label}>Gender</Text><View style={staffUi.input}><Text>{form.values.gender || "Optional"}</Text></View></TouchableOpacity>
                  </View>
                                    <Text translate style={staffUi.label}>Pay type</Text>
                  <View style={staffUi.tabs}>
                    {STAFF_PAY_TYPE_OPTIONS.map(type => <TouchableOpacity key={type} disabled={form.submitting} onPress={() => { form.updateField("payType", type === form.values.payType ? "" : type); form.updateField("fixedSalary", ""); form.updateField("hourlyRate", ""); }} style={[staffUi.tab, form.values.payType === type && { backgroundColor: pearl.glassStrong }]}><Text style={staffUi.rowTitle}>{type}</Text></TouchableOpacity>)}
                  </View>
                  {form.values.payType === "Fixed salary" ? field("fixedSalary", "Monthly salary *", "0", true) : null}
                  {form.values.payType === "Hourly" ? field("hourlyRate", "Hourly rate *", "0", true) : null}
                  {field("address", "Address")}
                </View>
                <Text translate style={staffUi.muted}>Only the fields marked * are needed to continue. You can add the rest later from the staff profile.</Text>
              </>
            ) : null}
            {step === 1 ? (
              <>
                {/* App login leads this step: whether this person can sign in
                    at all decides whether the rest of the step even matters. */}
                <View style={staffUi.formCard}>
                  <Text translate style={staffUi.heading}>App login</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text translate style={staffUi.rowTitle}>
                        {mode === "edit" ? "Set a new password" : "Allow this staff member to sign in"}
                      </Text>
                      <Text translate style={staffUi.muted}>
                        {mode === "edit"
                          ? "Their current login stays as it is unless you set a new one here."
                          : "Optional. Leave it off to save their details without login access."}
                      </Text>
                    </View>
                    <AppSwitch
                      value={form.values.isLoginEnabled}
                      onValueChange={value => {
                        form.updateField("isLoginEnabled", value);
                        if (!value) resetOtp();
                      }}
                      disabled={form.submitting}
                    />
                  </View>
                  {form.values.isLoginEnabled ? (
                    <>
                      {field("email", "Login email *", "Email address")}
                      {needsEmailOtp ? (
                        <>
                          <Text translate style={staffUi.muted}>
                            Verify this address with a one-time code before saving.
                          </Text>
                          {otpSent ? (
                            <>
                              <TextInput
                                accessibilityLabel="Verification code"
                                keyboardType="number-pad"
                                maxLength={6}
                                onChangeText={setEmailOtp}
                                placeholder="6-digit code"
                                placeholderTextColor={pearl.placeholder}
                                style={staffUi.input}
                                value={emailOtp}
                              />
                              <View style={{ flexDirection: "row", gap: 12 }}>
                                <View style={{ flex: 1 }}>
                                  <StaffButton
                                    disabled={otpBusy || form.submitting}
                                    label={otpBusy ? "Verifying…" : "Verify code"}
                                    onPress={() => void verifyLoginOtp()}
                                  />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <StaffButton
                                    secondary
                                    disabled={otpBusy || form.submitting}
                                    label="Resend"
                                    onPress={() => void sendLoginOtp()}
                                  />
                                </View>
                              </View>
                            </>
                          ) : (
                            <StaffButton
                              secondary
                              disabled={otpBusy || form.submitting || !loginEmail || !!form.allValidationErrors.email}
                              label={otpBusy ? "Sending…" : "Send verification code"}
                              onPress={() => void sendLoginOtp()}
                            />
                          )}
                        </>
                      ) : loginEmail ? (
                        <Text translate style={staffUi.muted}>Login email verified.</Text>
                      ) : null}
                      {otpMessage ? <Text style={staffUi.muted}>{otpMessage}</Text> : null}
                      {otpError ? (
                        <Text accessibilityRole="alert" style={staffUi.error}>{otpError}</Text>
                      ) : null}
                      <PasswordField
                        pearlStyle
                        label="Password *"
                        ref={(input) => {
                          refs.password.current = input;
                          setFieldRef("password", input);
                        }}
                        value={form.values.password}
                        onChangeText={(value) => form.updateField("password", value)}
                        placeholder="At least 8 characters"
                        error={form.validationErrors.password || (stepError ? form.allValidationErrors.password : undefined)}
                        autoComplete="off"
                        importantForAutofill="no"
                        returnKeyType="next"
                        submitBehavior="submit"
                        onSubmitEditing={() => refs.confirmPassword.current?.focus()}
                      />
                      <PasswordField
                        pearlStyle
                        label="Confirm password *"
                        ref={(input) => {
                          refs.confirmPassword.current = input;
                          setFieldRef("confirmPassword", input);
                        }}
                        value={form.values.confirmPassword}
                        onChangeText={(value) => form.updateField("confirmPassword", value)}
                        error={form.validationErrors.confirmPassword || (stepError ? form.allValidationErrors.confirmPassword : undefined)}
                        autoComplete="off"
                        importantForAutofill="no"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                      <Text translate style={staffUi.muted}>
                        Use at least 8 characters, with a number and both upper- and lower-case letters.
                      </Text>
                    </>
                  ) : null}
                </View>
                <View style={staffUi.formCard}>
                  <Text translate style={staffUi.heading}>Access level</Text>
                  <View style={staffUi.tabs}>
                    {STAFF_ROLE_OPTIONS.map(role => <TouchableOpacity key={role} disabled={form.submitting} onPress={() => { setPermissionOverrides({}); form.updateField("roleLevel", role); }} style={[staffUi.tab, role === form.values.roleLevel && { backgroundColor: pearl.glassStrong }]}><Text style={staffUi.rowTitle}>{role}</Text></TouchableOpacity>)}
                  </View>
                  <Text translate style={staffUi.muted}>Managers can see reports and edit bookings for everyone.</Text>
                </View>
                <StaffFormPermissions notice={form.values.isLoginEnabled ? undefined : "Turn on app login above first — permissions only apply to staff who can sign in."} disabled={form.submitting || !form.values.isLoginEnabled} role={form.values.roleLevel || "Staff"} staffId={form.values.roleLevel === (form.staffMember?.permissionLevel?.toLowerCase() === "manager" ? "Manager" : "Staff") ? staffId : null} overrides={permissionOverrides} onChange={setPermissionOverrides} onReady={setPermissionsReady} />
              </>
            ) : null}
            {stepError || form.error ? (
              <Text accessibilityRole="alert" style={staffUi.error}>
                {stepError || form.error}
              </Text>
            ) : null}
          </KeyboardAwareScrollView>
          <PearlActionFooter bottomInset={insets.bottom}>
            <View style={{ borderRadius: 16, backgroundColor: pearl.bgTop }}>
              <StaffButton
                secondary
                label={step === 0 ? "Cancel" : "Back"}
                onPress={handleBack}
                disabled={form.submitting}
              />
            </View>
            <View style={{ flex: 1 }}>
              <StaffButton
                label={
                  form.submitting
                    ? "Saving…"
                    : step === 0
                      ? "Next: Permissions & login"
                      : mode === "edit"
                        ? "Save staff"
                        : "Create staff"
                }
                disabled={
                  form.submitting ||
                  form.avatarUploading ||
                  (step === 1 && !permissionsReady) ||
                  !canManageStaffLifecycle(currentUser?.role)
                }
                onPress={step < 1 ? next : submit}
              />
            </View>
          </PearlActionFooter>
        </KeyboardInsetView>
        <BottomSheet
          avoidKeyboard
          pearlStyle
          centered={false}
          title={picker === "gender" ? "Gender" : "Designation"}
          visible={!!picker}
          onClose={() => setPicker(null)}
        >
          {(picker === "gender"
            ? ["Female", "Male", "Other"]
            : [
                "Stylist",
                "Senior stylist",
                "Barber",
                "Nail artist",
                "Beautician",
                "Therapist",
                "Receptionist",
              ]
          ).map((value) => (
            <StaffMenuItem
              key={value}
              label={value}
              icon="person-outline"
              onPress={() => {
                if (picker) form.updateField(picker, value);
                setPicker(null);
              }}
            />
          ))}
          {picker === "designation"
            ? field("designation", "Other designation")
            : null}
        </BottomSheet>
      </SafeAreaView>
    </PearlBackground>
  );
}
