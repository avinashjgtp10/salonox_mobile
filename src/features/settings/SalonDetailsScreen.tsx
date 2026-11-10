import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, RefreshControl, View } from "react-native";
import { router, type Href } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { KeyboardInsetView } from "@/components/ui/KeyboardInsetView";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { PearlActionFooter } from "@/components/ui/PearlActionFooter";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";
import {
  fetchSalonMeThunk,
  updateSalonThunk,
} from "@/middleware/salon/salon.thunk";
import {
  selectSalonById,
  selectSalonDetailsError,
  selectSalonDetailsLoading,
  selectSalonUpdating,
} from "@/store/salon/salon.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { useValidationScroll } from "@/hooks/useValidationScroll";
import { useAvatarUpload } from "@/features/profile/hooks/useAvatarUpload";
import { useProfilePhotoUrl } from "@/features/profile/utils/ownerProfilePhoto";
import {
  isValidEmail,
  isValidPhoneDigits,
  EMAIL_INVALID_MESSAGE,
  PHONE_INVALID_MESSAGE,
  sanitizePhoneDigits,
} from "@/utils/validation";
import { SettingsButton, SettingsHeader, useSettingsStyles } from "./SettingsUI";

type Field =
  | "businessName"
  | "email"
  | "phone"
  | "address"
  | "city"
  | "postalCode"
  | "gstin";
const ORDER: Field[] = [
  "businessName",
  "email",
  "phone",
  "address",
  "city",
  "postalCode",
  "gstin",
];
const EMPTY = {
  businessName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  gstin: "",
};
export default function SalonDetailsScreen() {
  const user = useAppSelector(selectCurrentUser);
  return <SalonDetails key={`${user?.id}:${user?.salonId}`} />;
}
function SalonDetails() {
  const ui = useSettingsStyles();
  const pearl = usePearlPalette();
  const user = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const salon = useAppSelector((state) =>
    selectSalonById(state, loadedId ?? user?.salonId),
  );
  const loading = useAppSelector(selectSalonDetailsLoading);
  const loadError = useAppSelector(selectSalonDetailsError);
  const updating = useAppSelector(selectSalonUpdating);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const prefilled = useRef(false);
  const { bottom } = useSafeAreaInsets();
  const inputs = useRef<Record<string, TextInput | null>>({});
  const navigationRefs = useMemo(
    () =>
      ORDER.map((field) => ({
        get current() {
          return inputs.current[field] ?? null;
        },
      })),
    [],
  );
  const keyboardNavigation = useMemo(
    () => ({
      fields: navigationRefs.map((ref) => ({ ref })),
      showAccessory: false,
    }),
    [navigationRefs],
  );
  const { scrollViewRef, setFieldRef, scrollToFirstError } =
    useValidationScroll(ORDER);
  const load = useCallback(async () => {
    const result = await dispatch(fetchSalonMeThunk());
    if (fetchSalonMeThunk.fulfilled.match(result) && result.payload)
      setLoadedId(result.payload.id);
  }, [dispatch]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (salon && !prefilled.current) {
      setValues({
        businessName: salon.businessName || salon.name,
        email: salon.email,
        phone: sanitizePhoneDigits(salon.phone),
        address: salon.address,
        city: salon.city,
        postalCode: salon.postalCode,
        gstin: salon.gstin,
      });
      prefilled.current = true;
    }
  }, [salon]);
  const avatarUrl = useProfilePhotoUrl(user);
  const avatar = useAvatarUpload({
    avatarUrl,
    onStart: () => {
      setError(null);
      setSuccess(null);
    },
    onError: setError,
    onSuccess: setSuccess,
  });
  const goBack = () => {
    if (updating || avatar.isUploading) return;
    Keyboard.dismiss();
    if (router.canGoBack()) router.back();
    else router.replace("/more" as Href);
  };
  const save = async () => {
    if (!salon || updating || avatar.isUploading) return;
    setError(null);
    setSuccess(null);
    const next: typeof errors = {};
    if (!values.businessName.trim())
      next.businessName = "Business name is required.";
    if (values.email.trim() && !isValidEmail(values.email.trim()))
      next.email = EMAIL_INVALID_MESSAGE;
    if (values.phone.trim() && !isValidPhoneDigits(values.phone.trim()))
      next.phone = PHONE_INVALID_MESSAGE;
    setErrors(next);
    if (Object.keys(next).length) {
      scrollToFirstError(next);
      return;
    }
    const result = await dispatch(
      updateSalonThunk({
        salonId: salon.id,
        formFields: {
          address: values.address.trim(),
          businessName: values.businessName.trim(),
          name: values.businessName.trim(),
          city: values.city.trim(),
          ...(values.email.trim() ? { email: values.email.trim() } : {}),
          phone: values.phone.trim(),
          postalCode: values.postalCode.trim(),
          ...(values.gstin.trim() !== salon.gstin
            ? { gstin: values.gstin.trim() }
            : {}),
        },
      }),
    );
    if (updateSalonThunk.rejected.match(result)) {
      setError(result.payload?.message || "Unable to update salon.");
      return;
    }
    setSuccess(result.payload.message || "Salon details saved");
    Keyboard.dismiss();
  };
  const field = (
    key: Field,
    label: string,
    keyboardType:
      | "default"
      | "email-address"
      | "phone-pad"
      | "number-pad" = "default",
  ) => (
    <View key={key} style={{ gap: 6 }}>
      <Text translate style={ui.muted}>{label}</Text>
      <TextInput
        ref={(ref) => {
          inputs.current[key] = ref;
          setFieldRef(key, ref);
        }}
        accessibilityLabel={label}
        editable={!updating}
        value={values[key]}
        onChangeText={(value) => {
          setValues((old) => ({
            ...old,
            [key]:
              key === "phone"
                ? sanitizePhoneDigits(value)
                : key === "gstin"
                  ? value.toUpperCase()
                  : value,
          }));
          setErrors((old) => ({ ...old, [key]: undefined }));
        }}
        autoCapitalize={
          key === "email" ? "none" : key === "gstin" ? "characters" : "words"
        }
        autoCorrect={false}
        keyboardType={keyboardType}
        placeholder={label.replace(" *", "")}
        placeholderTextColor={pearl.placeholder}
        style={[ui.input, !!errors[key] && { borderColor: pearl.danger }]}
        returnKeyType={key === "gstin" ? "done" : "next"}
        blurOnSubmit={false}
        onSubmitEditing={() => {
          const nextField = ORDER[ORDER.indexOf(key) + 1];
          if (nextField) inputs.current[nextField]?.focus();
          else Keyboard.dismiss();
        }}
      />
      {!!errors[key] && <Text style={ui.error}>{errors[key]}</Text>}
    </View>
  );
  return (
    <PearlBackground>
      <SafeAreaView edges={["top"]} style={ui.root}>
        <AppStatusBar />
        <SettingsHeader title="Salon details" centered onBack={goBack} />
        {!salon ? (
          <View
            style={{ flex: 1, padding: 24, gap: 16, justifyContent: "center" }}
          >
            {loading ? (
              <ActivityIndicator color={pearl.accent} />
            ) : (
              <>
                <Text translate style={ui.title}>
                  {loadError ? "Unable to load salon" : "Salon not available"}
                </Text>
                <Text style={ui.body}>
                  {loadError ||
                    "We couldn't find salon details for your account."}
                </Text>
                <SettingsButton label="Retry" onPress={() => void load()} />
              </>
            )}
          </View>
        ) : (
          <KeyboardInsetView bottomOffset={bottom}>
            <KeyboardAwareScrollView
              ref={scrollViewRef}
              pearlStyle
              padForKeyboard={false}
              keyboardNavigation={keyboardNavigation}
              extraScrollPadding={48}
              contentContainerStyle={ui.content}
              keyboardShouldPersistTaps="handled"
              refreshControl={
                <RefreshControl
                  refreshing={loading}
                  onRefresh={() => void load()}
                  tintColor={pearl.accent}
                />
              }
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <InitialsAvatar
                  imageUri={avatar.avatarUri}
                  initials={values.businessName
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0] || "")
                    .join("")
                    .toUpperCase()}
                  size={58}
                  bg={pearl.accentTint}
                  color={pearl.accentDeep}
                />
                <View style={{ flex: 1 }}>
                  <Text translate style={ui.title}>Salon logo</Text>
                  <Text translate style={ui.muted}>Shown on bills & WhatsApp</Text>
                </View>
                <SettingsButton
                  secondary
                  label="Change"
                  onPress={avatar.changePhoto}
                  loading={avatar.isUploading}
                  disabled={updating}
                />
              </View>
              <View style={ui.formCard}>
                <Text translate style={ui.title}>Business</Text>
                {field("businessName", "Business name *")}
                {field("email", "Email", "email-address")}
                {field("phone", "Phone", "phone-pad")}
              </View>
              <View style={ui.formCard}>
                <Text translate style={ui.title}>Address</Text>
                {field("address", "Street")}
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>{field("city", "City")}</View>
                  <View style={{ flex: 1 }}>
                    {field("postalCode", "PIN code", "number-pad")}
                  </View>
                </View>
                <Text translate style={ui.muted}>
                  This address is used on the Settings card and bills.
                </Text>
              </View>
              <View style={ui.formCard}>
                <Text translate style={ui.title}>Tax</Text>
                {field("gstin", "GSTIN")}
                <Text translate style={ui.muted}>Optional</Text>
              </View>
              <View style={ui.formCard}>
                <Text translate style={ui.title}>Salon information</Text>
                {[
                  ["Status", salon.status],
                  ["Country", salon.country],
                  ["State", salon.state],
                  ["Timezone", salon.timezone],
                ].map(([label, value]) => (
                  <View key={label} style={{ flexDirection: "row", gap: 12 }}>
                    <Text translate style={[ui.muted, { flex: 1 }]}>{label}</Text>
                    <Text style={[ui.body, { flex: 1, textAlign: "right" }]}>
                      {value || "—"}
                    </Text>
                  </View>
                ))}
              </View>
              {!!error && (
                <Text translate accessibilityRole="alert" style={ui.error}>
                  {error}
                </Text>
              )}
              {!!success && (
                <Text accessibilityLiveRegion="polite" style={ui.body}>
                  {success}
                </Text>
              )}
            </KeyboardAwareScrollView>
            <PearlActionFooter bottomInset={bottom}>
              <View style={{ minWidth: 80 }}>
                <SettingsButton
                  secondary
                  label="Cancel"
                  onPress={goBack}
                  disabled={updating || avatar.isUploading}
                />
              </View>
              <View style={{ flex: 1 }}>
                <SettingsButton
                  label="Save changes"
                  onPress={() => void save()}
                  loading={updating}
                  disabled={avatar.isUploading}
                />
              </View>
            </PearlActionFooter>
          </KeyboardInsetView>
        )}
      </SafeAreaView>
    </PearlBackground>
  );
}
