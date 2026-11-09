import { useEffect, useMemo, useState, createRef } from "react";
import { Keyboard, Switch, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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
import { pearl } from "@/components/auth/pearl/tokens";
import { appAlert as Alert } from "@/services/appAlert";
import { api, getApiErrorMessage } from "@/services/api";
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
  "fullName",
  "email",
  "phone",
  "dob",
  "joiningDate",
  "address",
  "gender",
  "designation",
  "hourlyRate",
  "fixedSalary",
  "workingHoursPerDay",
  "holidays",
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

const STEP_FIELDS: (keyof StaffProfileFormValues)[][] = [
  ["fullName", "phone", "email", "dob", "joiningDate", "address"],
  [
    "designation",
    "gender",
    "roleLevel",
    "fixedSalary",
    "hourlyRate",
    "workingHoursPerDay",
    "holidays",
  ],
  ["email", "password", "confirmPassword"],
];
export function StaffFormScreen({ mode }: { mode: "create" | "edit" }) {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; step?: string }>();
  const staffId = mode === "edit" ? params.id : null;
  const form = useStaffForm(staffId);
  useStaffDetails(staffId);
  const currentUser = useAppSelector(selectCurrentUser);
  const [step, setStep] = useState(params.step === "3" ? 2 : 0),
    [pay, setPay] = useState("Fixed salary"),
    [picker, setPicker] = useState<"designation" | "gender" | null>(null),
    [stepError, setStepError] = useState(""),
    [avatarValidationError, setAvatarValidationError] = useState<string | null>(
      null,
    );
  const [otp, setOtp] = useState(""),
    [sentEmail, setSentEmail] = useState(""),
    [verifiedEmail, setVerifiedEmail] = useState(""),
    [otpBusy, setOtpBusy] = useState(false),
    [otpMessage, setOtpMessage] = useState("");
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
  const otpInput = useMemo(() => createRef<TextInput>(), []);
  const navigation = useMemo(
    () => ({
      showAccessory: false,
      fields: STEP_FIELDS[step].flatMap((field) => [
        {
          ref: refs[field],
          disabled:
            ["dob", "joiningDate", "roleLevel", "gender"].includes(field) ||
            (field === "password" && !form.values.isLoginEnabled) ||
            (field === "confirmPassword" && !form.values.isLoginEnabled) ||
            (field === "hourlyRate" && pay !== "Hourly") ||
            (field === "fixedSalary" && pay !== "Fixed salary"),
        },
        ...(step === 2 && field === "email"
          ? [{ ref: otpInput, disabled: !form.values.isLoginEnabled }]
          : []),
      ]),
    }),
    [refs, step, pay, form.values.isLoginEnabled, otpInput],
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
      error={form.validationErrors[key]}
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
  const email = form.values.email.trim().toLowerCase();
  const emailAlreadyVerified =
    mode === "edit" &&
    form.staffMember?.emailVerified &&
    email === form.staffMember.email.toLowerCase();
  const emailVerified =
    emailAlreadyVerified || (verifiedEmail === email && !!email);
  const emailOtp = async (verify: boolean) => {
    setOtpBusy(true);
    setOtpMessage("");
    try {
      const response = await api.post<{
        status?: string;
        success?: boolean;
        data?: { success?: boolean };
      }>(
        verify ? "/auth/verify-email-otp" : "/auth/send-email-otp",
        verify ? { email, otp } : { email },
      );
      if (verify) {
        if (
          response.data.status !== "success" &&
          !response.data.success &&
          !response.data.data?.success
        )
          throw new Error("Verification failed. Please check the OTP.");
        setVerifiedEmail(email);
      } else {
        setSentEmail(email);
        setOtpMessage("OTP sent. Check the staff member's inbox.");
      }
    } catch (e) {
      setOtpMessage(getApiErrorMessage(e));
    } finally {
      setOtpBusy(false);
    }
  };
  const next = () => {
    setStepError("");
    const errorKey = STEP_FIELDS[step].find(
      (key) => form.allValidationErrors[key],
    );
    if (errorKey) {
      setStepError(form.allValidationErrors[errorKey]);
      scrollToFirstError(form.allValidationErrors);
      return;
    }
    Keyboard.dismiss();
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    setStep(step + 1);
  };
  const submit = () => {
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
    if (form.values.isLoginEnabled && !emailVerified) {
      setStepError("Verify the staff member's email before enabling login.");
      return;
    }
    void form.submit();
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
              {["Profile", "Role & pay", "Login"].map((label, index) => (
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
                    {label}
                  </Text>
                </View>
              ))}
            </View>
            {step === 0 ? (
              <>
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
                  <Text translate style={staffUi.heading}>About</Text>
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
                      error={form.validationErrors.phone}
                      onCountryChange={(value) =>
                        form.updateField("phoneCountry", value)
                      }
                      value={form.values.phone}
                      onChange={(value) => form.updateField("phone", value)}
                      onSubmitEditing={() => refs.email.current?.focus()}
                    />
                  </View>
                  {field("email", "Email", "For login & payslips")}
                </View>
                <View style={staffUi.formCard}>
                  <Text translate style={staffUi.heading}>Dates</Text>
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
                        error={form.validationErrors.joiningDate}
                      />
                    </View>
                  </View>
                  {field("address", "Address")}
                </View>
              </>
            ) : null}
            {step === 1 ? (
              <>
                <View style={staffUi.formCard}>
                  <Text translate style={staffUi.heading}>Role</Text>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    {(["designation", "gender"] as const).map((key) => (
                      <TouchableOpacity
                        key={key}
                        onPress={() => setPicker(key)}
                        style={{ flex: 1 }}
                      >
                        <Text translate style={staffUi.label}>
                          {key === "designation" ? "Designation" : "Gender"}
                        </Text>
                        <View
                          style={[
                            staffUi.input,
                            { flexDirection: "row", alignItems: "center" },
                          ]}
                        >
                          <Text
                            style={{
                              flex: 1,
                              color: form.values[key] ? pearl.ink : pearl.muted,
                            }}
                          >
                            {form.values[key] ||
                              (key === "gender" ? "Optional" : "Choose")}
                          </Text>
                          <Ionicons
                            name="chevron-down"
                            size={16}
                            color={pearl.muted}
                          />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text translate style={staffUi.label}>Access level *</Text>
                  <View style={staffUi.tabs}>
                    {STAFF_ROLE_OPTIONS.map((role) => (
                      <TouchableOpacity
                        key={role}
                        onPress={() => form.updateField("roleLevel", role)}
                        style={[
                          staffUi.tab,
                          role === form.values.roleLevel && {
                            backgroundColor: pearl.glassStrong,
                          },
                        ]}
                      >
                        <Text style={staffUi.rowTitle}>{role}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text translate style={staffUi.muted}>
                    Access follows the assigned role and individual permissions.
                  </Text>
                </View>
                <View style={staffUi.formCard}>
                  <Text translate style={staffUi.heading}>Pay</Text>
                  <Text translate style={staffUi.label}>How is this person paid?</Text>
                  <View style={staffUi.tabs}>
                    {["Fixed salary", "Hourly"].map((option) => (
                      <TouchableOpacity
                        key={option}
                        onPress={() => {
                          setPay(option);
                          form.updateField(
                            option === "Hourly" ? "fixedSalary" : "hourlyRate",
                            "",
                          );
                        }}
                        style={[
                          staffUi.tab,
                          pay === option && {
                            backgroundColor: pearl.glassStrong,
                          },
                        ]}
                      >
                        <Text style={staffUi.rowTitle}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {pay === "Fixed salary"
                    ? field("fixedSalary", "Monthly salary", "0", true)
                    : field("hourlyRate", "Hourly rate", "0", true)}
                  {field("workingHoursPerDay", "Hours / day", "e.g. 10", true)}
                  {field("holidays", "Holidays", "Optional", true)}
                </View>
              </>
            ) : null}
            {step === 2 ? (
              <>
                <View style={staffUi.formCard}>
                  <Text translate style={staffUi.heading}>App login</Text>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text translate style={staffUi.rowTitle}>
                        Allow staff to sign in
                      </Text>
                      <Text translate style={staffUi.muted}>
                        Uses their email address
                      </Text>
                    </View>
                    <Switch
                      value={form.values.isLoginEnabled}
                      onValueChange={(value) =>
                        form.updateField("isLoginEnabled", value)
                      }
                      thumbColor="#FFFFFF"
                      trackColor={{ false: pearl.divider, true: pearl.accent }}
                    />
                  </View>
                  {form.values.isLoginEnabled ? (
                    <>
                      {field("email", "Login email *", "Email address")}
                      <StaffButton
                        secondary
                        disabled={otpBusy || emailVerified || !email}
                        label={
                          emailVerified
                            ? "Email verified"
                            : otpBusy
                              ? "Please wait…"
                              : "Send OTP"
                        }
                        onPress={() => void emailOtp(false)}
                      />
                      {sentEmail && sentEmail === email && !emailVerified ? (
                        <>
                          <TextInput
                            ref={otpInput}
                            accessibilityLabel="Email OTP"
                            value={otp}
                            onChangeText={setOtp}
                            placeholder="6-digit OTP"
                            placeholderTextColor={pearl.placeholder}
                            keyboardType="number-pad"
                            maxLength={6}
                            style={staffUi.input}
                          />
                          <StaffButton
                            secondary
                            label="Verify OTP"
                            disabled={otpBusy || otp.length !== 6}
                            onPress={() => void emailOtp(true)}
                          />
                        </>
                      ) : null}
                      {otpMessage ? (
                        <Text style={staffUi.muted}>{otpMessage}</Text>
                      ) : null}
                      <PasswordField
                        pearlStyle
                        label="Temporary password"
                        ref={(input) => {
                          refs.password.current = input;
                          setFieldRef("password", input);
                        }}
                        value={form.values.password}
                        onChangeText={(value) =>
                          form.updateField("password", value)
                        }
                        placeholder="At least 8 characters"
                        error={form.validationErrors.password}
                        autoComplete="off"
                        importantForAutofill="no"
                        returnKeyType="next"
                        submitBehavior="submit"
                        onSubmitEditing={() =>
                          refs.confirmPassword.current?.focus()
                        }
                      />
                      <PasswordField
                        pearlStyle
                        label="Confirm password"
                        ref={(input) => {
                          refs.confirmPassword.current = input;
                          setFieldRef("confirmPassword", input);
                        }}
                        value={form.values.confirmPassword}
                        onChangeText={(value) =>
                          form.updateField("confirmPassword", value)
                        }
                        error={form.validationErrors.confirmPassword}
                        autoComplete="off"
                        importantForAutofill="no"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                      <Text translate style={staffUi.muted}>
                        Leave the password blank to send an email invite.
                      </Text>
                    </>
                  ) : null}
                </View>
                <View style={staffUi.formCard}>
                  <Text translate style={staffUi.heading}>Can access</Text>
                  <Text style={staffUi.muted}>
                    Permissions follow the assigned{" "}
                    {form.values.roleLevel || "Staff"} role. Manage individual
                    permissions after saving.
                  </Text>
                  {staffId ? (
                    <StaffButton
                      secondary
                      label="Staff permissions"
                      onPress={() =>
                        router.push(
                          ("/team/permissions?staffId=" + staffId) as Href,
                        )
                      }
                    />
                  ) : null}
                </View>
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
                      ? "Next: Role & pay"
                      : step === 1
                        ? "Next: Login"
                        : mode === "edit"
                          ? "Save staff"
                          : "Create staff"
                }
                disabled={
                  form.submitting ||
                  form.avatarUploading ||
                  otpBusy ||
                  !canManageStaffLifecycle(currentUser?.role)
                }
                onPress={step < 2 ? next : submit}
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
                form.updateField(picker!, value);
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
