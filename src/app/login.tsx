import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { validatePhoneNumberLength, isValidPhoneNumber } from "libphonenumber-js";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { ApiError, getApiErrorMessage } from "@/services/api";
import { authService } from "@/services/authService";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { AddressAutocomplete } from "@/components/maps/AddressAutocomplete";
import { GoogleMapPreview } from "@/components/maps/GoogleMapPreview";
import { CurrentLocationButton } from "@/components/maps/CurrentLocationButton";
import { type AddressDetails } from "@/types/location";
import type { ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/theme/ThemeProvider";
import { resolveLoginRoute } from "@/utils/routeResolver";
import {
  CONFIRM_PASSWORD_MISMATCH_MESSAGE_GENERIC,
  EMAIL_INVALID_MESSAGE,
  isValidEmail,
  isValidPassword,
  PASSWORD_REQUIREMENT_MESSAGE,
} from "@/utils/validation";

// ─── Color Palette ───────────────────────────────────────────
// Derived straight from the real theme tokens (constants/theme.ts) so this
// screen inherits the app's active palette automatically instead of carrying
// its own scheme-specific hex fallbacks.
const createAuthColors = (theme: ThemeColors, scheme: "light" | "dark") => ({
  bgGradientStart: theme.bg,
  bgGradientEnd: theme.bg2,
  primary: theme.primary,
  primaryDark: theme.primaryDark,
  secondary: theme.secondary,
  accent: theme.gold,
  accentDark: theme.goldDark,
  shadow: theme.shadow,
  text: theme.heading,
  textPrimary: theme.text,
  textSecondary: theme.text2,
  placeholder: theme.placeholder,
  cardBg: theme.card,
  cardBorder: theme.border,
  inputBg: theme.bg2,
  inputBorder: theme.border,
  inputBorderFocus: theme.focusBorder,
  error: theme.error,
  errorBg: theme.errorBg,
  errorBorder: theme.errorBorder,
  success: theme.success,
  successBg: theme.successBg,
  successBorder: theme.successBorder,
  warning: theme.warning,
  statusBarStyle: scheme === "dark" ? ("light-content" as const) : ("dark-content" as const),
});

type AuthColors = ReturnType<typeof createAuthColors>;

const useAuthColors = () => {
  const { colors, scheme } = useAppTheme();

  return useMemo(() => createAuthColors(colors, scheme), [colors, scheme]);
};

const DEFAULT_COUNTRY = "India";
const getRouteParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

// Wrong-password attempts are never blocked or rate-limited on the frontend —
// only a real backend lock/rate-limit (see isAccountLockedError) can do that.
// This just recognizes the backend's plain "wrong email or password" error so
// its "Attempts left: N" suffix can be dropped entirely (requirement: never
// show remaining attempts) in favor of a locally-tracked consecutive-attempt
// count driving the copy below.
const isInvalidCredentialsError = (loginError: unknown) => {
  const rawMessage = getApiErrorMessage(loginError);

  return /INVALID_CREDENTIALS/i.test(rawMessage) || /Invalid credentials/i.test(rawMessage);
};

// The backend's own rate-limit/account-lock response (429 "Too many failed
// attempts..."), distinct from a plain wrong-password 401. Its message is
// shown verbatim rather than the generic copy below.
const isAccountLockedError = (loginError: unknown) =>
  loginError instanceof ApiError && loginError.status === 429;

const FORGOT_PASSWORD_HINT =
  "Forgot your password? You can reset it using the 'Forgot Password' option below.";

const OTP_RESEND_COOLDOWN_SECONDS = 60;

const formatCountdown = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const getEmailOtpError = (otpError: unknown) => {
  const message = getApiErrorMessage(otpError);
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("expired")) {
    return "This OTP has expired. Please request a new code.";
  }

  if (
    normalizedMessage.includes("invalid") ||
    normalizedMessage.includes("incorrect") ||
    normalizedMessage.includes("wrong") ||
    normalizedMessage.includes("does not match")
  ) {
    return "Invalid OTP. Please check the code and try again.";
  }

  return message;
};

const getInvalidCredentialsMessage = (consecutiveFailedAttempts: number) => {
  const baseMessage = "The email or password you entered is incorrect.";

  return consecutiveFailedAttempts >= 3 ? `${baseMessage}\n${FORGOT_PASSWORD_HINT}` : baseMessage;
};

const getFriendlyLoginErrorMessage = (loginError: unknown) => {
  const rawMessage = getApiErrorMessage(loginError);
  const cleanedMessage = rawMessage
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^[A-Z0-9_]+$/.test(line))
    .join("\n");

  return cleanedMessage || "We could not sign you in. Please try again.";
};

type RegisterFieldErrors = Partial<
  Record<
    | "fullName"
    | "businessName"
    | "address"
    | "email"
    | "phone"
    | "password"
    | "confirmPassword"
    | "terms",
    string
  >
>;

type RegisterStep = 1 | 2 | 3;

const REGISTER_STEP_TITLES: Record<RegisterStep, string> = {
  1: "Personal Details",
  2: "Business Details",
  3: "Security",
};

const REGISTER_STEP_FIELDS: Record<RegisterStep, (keyof RegisterFieldErrors)[]> = {
  1: ["fullName", "email", "phone"],
  2: ["businessName", "address"],
  3: ["password", "confirmPassword", "terms"],
};

export default function LoginScreen() {
  const Colors = useAuthColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const params = useLocalSearchParams<{ mode?: string; successMessage?: string }>();
  const routeSuccessMessage = getRouteParam(params.successMessage);
  const { clearError, error, isLoading, signIn, signInWithGoogle, signUp } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(getRouteParam(params.mode) === "register");
  const [registrationStep, setRegistrationStep] = useState<RegisterStep>(1);
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [placeId, setPlaceId] = useState("");
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [email, setEmail] = useState("");
  const [countryCode] = useState("+91");
  const [phoneE164, setPhoneE164] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  // Consecutive failed login attempts, tracked locally for this app session
  // only (never sent to or driven by the backend beyond its own real
  // lock/rate-limit response). Resets on a successful login or when the
  // email is changed. Never used to block/disable the Sign In button.
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [dismissedRouteSuccessMessage, setDismissedRouteSuccessMessage] = useState<string | null>(
    null,
  );
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpError, setEmailOtpError] = useState<string | null>(null);
  const [emailOtpSuccess, setEmailOtpSuccess] = useState<string | null>(null);
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);
  const [emailOtpCooldownSeconds, setEmailOtpCooldownSeconds] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [scrollContentHeight, setScrollContentHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldOffsets = useRef<Partial<Record<keyof RegisterFieldErrors, number>>>({});
  const contentOverflows = scrollContentHeight > scrollViewHeight + 1;
  const shouldEnableScroll = contentOverflows || isKeyboardVisible;

  // Animations
  const [cardOpacity] = useState(() => new Animated.Value(0));
  const [cardScale] = useState(() => new Animated.Value(0.96));

  // Pressable states scales
  const [googleScale] = useState(() => new Animated.Value(1));
  const [signInScale] = useState(() => new Animated.Value(1));
  const displayedSuccess =
    formSuccess ??
    (routeSuccessMessage && dismissedRouteSuccessMessage !== routeSuccessMessage
      ? routeSuccessMessage
      : null);
  const normalizedRegistrationEmail = email.trim().toLowerCase();
  const isEmailVerifiedForCurrentEmail =
    Boolean(normalizedRegistrationEmail) && verifiedEmail === normalizedRegistrationEmail;
  const isEmailOtpBusy = isSendingEmailOtp || isVerifyingEmailOtp;
  const isEmailOtpCooldownActive = emailOtpCooldownSeconds > 0;
  const emailOtpCountdown = useMemo(
    () => formatCountdown(emailOtpCooldownSeconds),
    [emailOtpCooldownSeconds],
  );

  useEffect(() => {
    if (emailOtpCooldownSeconds <= 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setEmailOtpCooldownSeconds((currentSeconds) => Math.max(currentSeconds - 1, 0));
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [emailOtpCooldownSeconds]);

  const clearFormSuccess = () => {
    setFormSuccess(null);

    if (routeSuccessMessage) {
      setDismissedRouteSuccessMessage(routeSuccessMessage);
    }
  };

  const resetEmailVerificationState = () => {
    setVerifiedEmail(null);
    setEmailOtp("");
    setEmailOtpError(null);
    setEmailOtpSuccess(null);
    setIsEmailOtpSent(false);
    setEmailOtpCooldownSeconds(0);
  };

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [cardOpacity, cardScale]);

  useEffect(() => {
    const keyboardShowSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
    });
    const keyboardHideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardShowSubscription.remove();
      keyboardHideSubscription.remove();
    };
  }, []);

  const handlePressIn = (scaleRef: Animated.Value) => {
    Animated.spring(scaleRef, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (scaleRef: Animated.Value) => {
    Animated.spring(scaleRef, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const registerFieldPosition = (fieldName: keyof RegisterFieldErrors, y: number) => {
    fieldOffsets.current[fieldName] = y;
  };

  const scrollToFirstInvalidField = (errors: RegisterFieldErrors) => {
    const fieldOrder: (keyof RegisterFieldErrors)[] = [
      "fullName",
      "businessName",
      "address",
      "email",
      "phone",
      "password",
      "confirmPassword",
      "terms",
    ];
    const firstInvalidField = fieldOrder.find((fieldName) => Boolean(errors[fieldName]));

    if (!firstInvalidField) {
      return;
    }

    setTimeout(() => {
      const fieldOffset = fieldOffsets.current[firstInvalidField] ?? 0;

      scrollViewRef.current?.scrollTo({
        y: Math.max(fieldOffset - 24, 0),
        animated: true,
      });
    }, 50);
  };

  const clearRegisterFieldError = (fieldName: keyof RegisterFieldErrors) => {
    setFieldErrors((currentErrors) => {
      if (!currentErrors[fieldName]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[fieldName];
      return nextErrors;
    });
  };

  const handleEmailChange = (nextEmail: string) => {
    const nextNormalizedEmail = nextEmail.trim().toLowerCase();

    setEmail(nextEmail);
    setFormError(null);
    clearFormSuccess();
    clearRegisterFieldError("email");
    clearError();
    setFailedLoginAttempts(0);

    if (
      (verifiedEmail && verifiedEmail !== nextNormalizedEmail) ||
      (isEmailOtpSent && normalizedRegistrationEmail !== nextNormalizedEmail)
    ) {
      resetEmailVerificationState();
    } else {
      setEmailOtpError(null);
      setEmailOtpSuccess(null);
    }
  };

  const handleFullNameChange = (nextFullName: string) => {
    setFullName(nextFullName);
    setFormError(null);
    clearFormSuccess();
    clearRegisterFieldError("fullName");
    clearError();
  };

  const handleBusinessNameChange = (nextBusinessName: string) => {
    setBusinessName(nextBusinessName);
    setFormError(null);
    clearFormSuccess();
    clearRegisterFieldError("businessName");
    clearError();
  };



  const handleAddressSelected = (details: AddressDetails) => {
    setAddress(details.formatted_address);
    setAddressLine1(details.address_line_1);
    setArea(details.area);
    setCity(details.city);
    setState(details.state);
    setCountry(details.country);
    setPostalCode(details.postal_code);
    setLatitude(details.latitude);
    setLongitude(details.longitude);
    setPlaceId(details.place_id);
    setIsManualEntry(false);
    clearRegisterFieldError("address");
  };

  const handleLocationError = (msg: string) => {
    setFormError(msg);
  };

  const updateFormattedAddress = (
    line1: string,
    locality: string,
    cityName: string,
    stateName: string,
    zipCode: string
  ) => {
    const parts = [line1, locality, cityName, stateName, zipCode].filter((p) => p && p.trim());
    const newAddress = parts.join(", ");
    setAddress(newAddress);
    clearRegisterFieldError("address");
  };

  const handlePhoneChange = (e164: string) => {
    setPhoneE164(e164);
    setFormError(null);
    clearFormSuccess();
    clearRegisterFieldError("phone");
    clearError();
  };

  const handlePasswordChange = (nextPassword: string) => {
    setPassword(nextPassword);
    setFormError(null);
    clearFormSuccess();
    clearRegisterFieldError("password");
    clearRegisterFieldError("confirmPassword");
    clearError();
  };

  const handleConfirmPasswordChange = (nextConfirmPassword: string) => {
    setConfirmPassword(nextConfirmPassword);
    setFormError(null);
    clearFormSuccess();
    clearRegisterFieldError("confirmPassword");
    clearError();
  };

  const handleTermsPress = () => {
    setTermsAccepted((currentValue) => !currentValue);
    setFormError(null);
    clearFormSuccess();
    clearRegisterFieldError("terms");
    clearError();
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      const validationMessage = "Please enter your email address and password.";

      setFormError(validationMessage);
      clearFormSuccess();
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setFormError(EMAIL_INVALID_MESSAGE);
      clearFormSuccess();
      return;
    }

    setFormError(null);
    clearFormSuccess();

    try {
      const authData = await signIn({ email: trimmedEmail, password });

      setFailedLoginAttempts(0);

      router.replace(resolveLoginRoute(authData));
    } catch (loginError) {
      if (isAccountLockedError(loginError)) {
        // Real backend-enforced lock/rate-limit — show its own message
        // verbatim instead of the generic copy, and leave the local
        // consecutive-attempt counter untouched (this isn't a wrong-password
        // event, it's the backend refusing further attempts outright).
        setFormError(getApiErrorMessage(loginError));
        return;
      }

      if (isInvalidCredentialsError(loginError)) {
        const nextFailedAttempts = failedLoginAttempts + 1;

        setFailedLoginAttempts(nextFailedAttempts);
        setFormError(getInvalidCredentialsMessage(nextFailedAttempts));
        return;
      }

      setFormError(getFriendlyLoginErrorMessage(loginError));
    }
  };

  const getRegisterPayload = () => ({
      fullName: fullName.trim(),
      businessName: businessName.trim(),
      address: address.trim(),
      email: email.trim(),
      country: DEFAULT_COUNTRY,
      countryCode,
      // phoneE164 is already in E.164 format (e.g. +919876543210)
      phone: phoneE164,
      password,
      terms: termsAccepted,
      formatted_address: address.trim(),
      address_line_1: addressLine1.trim(),
      area: area.trim(),
      city: city.trim(),
      state: state.trim(),
      country_name: country.trim() || DEFAULT_COUNTRY,
      postal_code: postalCode.trim(),
      latitude: latitude ?? 0,
      longitude: longitude ?? 0,
      place_id: placeId.trim() || (isManualEntry ? "manual" : ""),
  });

  const getRegisterStepErrors = (step: RegisterStep) => {
    const registerPayload = getRegisterPayload();
    const nextFieldErrors: RegisterFieldErrors = {};

    if (step === 1) {
      if (!registerPayload.fullName) {
        nextFieldErrors.fullName = "Full Name is required.";
      }

      if (!registerPayload.email) {
        nextFieldErrors.email = "Email is required.";
      } else if (!isValidEmail(registerPayload.email)) {
        nextFieldErrors.email = EMAIL_INVALID_MESSAGE;
      }

      if (!registerPayload.phone) {
        nextFieldErrors.phone = "Phone number is required.";
      } else {
        // Validate using libphonenumber-js for international support.
        const lengthResult = validatePhoneNumberLength(registerPayload.phone);
        if (lengthResult === "TOO_SHORT") {
          nextFieldErrors.phone = "Phone number is too short.";
        } else if (lengthResult === "TOO_LONG") {
          nextFieldErrors.phone = "Phone number is too long.";
        } else if (!isValidPhoneNumber(registerPayload.phone)) {
          nextFieldErrors.phone = "Please enter a valid phone number.";
        }
      }
    }

    if (step === 2) {
      if (!registerPayload.businessName) {
        nextFieldErrors.businessName = "Business Name is required.";
      }

      if (!registerPayload.address) {
        nextFieldErrors.address = "Address is required.";
      } else {
        if (!registerPayload.city) {
          nextFieldErrors.address = "City is required. Please verify your address details.";
        } else if (!registerPayload.state) {
          nextFieldErrors.address = "State / Province / Region is required.";
        } else if (!isManualEntry && (latitude === null || longitude === null || !registerPayload.place_id)) {
          nextFieldErrors.address = "A valid location selection or manual entry is required.";
        }
      }
    }

    if (step === 3) {
      if (!registerPayload.password) {
        nextFieldErrors.password = "Password is required.";
      } else if (!isValidPassword(registerPayload.password)) {
        nextFieldErrors.password = PASSWORD_REQUIREMENT_MESSAGE;
      }

      if (!confirmPassword) {
        nextFieldErrors.confirmPassword = "Confirm Password is required.";
      } else if (registerPayload.password !== confirmPassword) {
        nextFieldErrors.confirmPassword = CONFIRM_PASSWORD_MISMATCH_MESSAGE_GENERIC;
      }

      if (!registerPayload.terms) {
        nextFieldErrors.terms = "Terms & Conditions must be accepted.";
      }
    }

    return nextFieldErrors;
  };

  const getFirstInvalidRegisterStep = (errors: RegisterFieldErrors): RegisterStep => {
    if (REGISTER_STEP_FIELDS[1].some((fieldName) => errors[fieldName])) {
      return 1;
    }

    if (REGISTER_STEP_FIELDS[2].some((fieldName) => errors[fieldName])) {
      return 2;
    }

    return 3;
  };

  const validateRegisterStep = (step: RegisterStep) => {
    const nextStepErrors = getRegisterStepErrors(step);
    const hasStepErrors = Object.keys(nextStepErrors).length > 0;

    if (hasStepErrors) {
      setFieldErrors((currentErrors) => ({ ...currentErrors, ...nextStepErrors }));
      setFormError(null);
      scrollToFirstInvalidField(nextStepErrors);
      return false;
    }

    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      REGISTER_STEP_FIELDS[step].forEach((fieldName) => {
        delete nextErrors[fieldName];
      });
      return nextErrors;
    });
    setFormError(null);
    return true;
  };

  const validateEmailForOtp = () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setFieldErrors((currentErrors) => ({ ...currentErrors, email: "Email is required." }));
      return false;
    }

    if (!isValidEmail(trimmedEmail)) {
      setFieldErrors((currentErrors) => ({ ...currentErrors, email: EMAIL_INVALID_MESSAGE }));
      return false;
    }

    clearRegisterFieldError("email");
    return true;
  };

  const handleSendEmailOtp = async () => {
    if (isSendingEmailOtp || isVerifyingEmailOtp || isEmailVerifiedForCurrentEmail) {
      return;
    }

    if (!validateEmailForOtp()) {
      return;
    }

    setIsSendingEmailOtp(true);
    setEmailOtp("");
    setEmailOtpError(null);
    setEmailOtpSuccess(null);
    setFormError(null);
    clearFormSuccess();
    clearError();

    try {
      const response = await authService.sendEmailOtp({ email: email.trim() });

      setIsEmailOtpSent(true);
      setEmailOtpSuccess(response.message);
      setEmailOtpCooldownSeconds(OTP_RESEND_COOLDOWN_SECONDS);
    } catch (sendOtpError) {
      setEmailOtpError(getApiErrorMessage(sendOtpError));
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  const handleResendEmailOtp = async () => {
    if (
      isSendingEmailOtp ||
      isVerifyingEmailOtp ||
      isEmailOtpCooldownActive ||
      isEmailVerifiedForCurrentEmail
    ) {
      return;
    }

    await handleSendEmailOtp();
  };

  const handleEmailOtpChange = (nextOtp: string) => {
    setEmailOtp(nextOtp.replace(/\D/g, ""));
    setEmailOtpError(null);
    setEmailOtpSuccess(null);
  };

  const handleVerifyEmailOtp = async () => {
    const trimmedOtp = emailOtp.trim();

    if (isVerifyingEmailOtp || isSendingEmailOtp || isEmailVerifiedForCurrentEmail) {
      return;
    }

    if (!validateEmailForOtp()) {
      return;
    }

    if (!trimmedOtp) {
      setEmailOtpError("OTP is required.");
      return;
    }

    if (trimmedOtp.length < 4) {
      setEmailOtpError("Please enter a valid OTP.");
      return;
    }

    setIsVerifyingEmailOtp(true);
    setEmailOtpError(null);
    setEmailOtpSuccess(null);
    setFormError(null);
    clearFormSuccess();
    clearError();

    try {
      await authService.verifyEmailOtp({ email: email.trim(), otp: trimmedOtp });

      setVerifiedEmail(normalizedRegistrationEmail);
      setEmailOtp("");
      setEmailOtpError(null);
      setEmailOtpSuccess("Email Verified");
      setIsEmailOtpSent(false);
      setEmailOtpCooldownSeconds(0);
      clearRegisterFieldError("email");
    } catch (verifyOtpError) {
      setEmailOtpError(getEmailOtpError(verifyOtpError));
    } finally {
      setIsVerifyingEmailOtp(false);
    }
  };

  const handleRegisterNext = () => {
    if (!validateRegisterStep(registrationStep)) {
      return;
    }

    if (registrationStep === 1 && !isEmailVerifiedForCurrentEmail) {
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        email: "Please verify your email before continuing.",
      }));
      setEmailOtpError("Please verify your email before continuing.");
      scrollToFirstInvalidField({ email: "Please verify your email before continuing." });
      return;
    }

    setRegistrationStep((currentStep) => (currentStep === 1 ? 2 : 3));
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleRegisterBack = () => {
    setRegistrationStep((currentStep) => (currentStep === 3 ? 2 : 1));
    setFormError(null);
    clearError();
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleRegister = async () => {
    const registerPayload = getRegisterPayload();
    const nextFieldErrors = {
      ...getRegisterStepErrors(1),
      ...getRegisterStepErrors(2),
      ...getRegisterStepErrors(3),
    };

    if (Object.keys(nextFieldErrors).length > 0) {
      const firstInvalidStep = getFirstInvalidRegisterStep(nextFieldErrors);

      setRegistrationStep(firstInvalidStep);
      setFieldErrors(nextFieldErrors);
      setFormError(null);
      setTimeout(() => scrollToFirstInvalidField(nextFieldErrors), 50);
      return;
    }

    setFieldErrors({});
    setFormError(null);

    try {
      await signUp(registerPayload);
    } catch (registerError) {
      const errorMessage = getApiErrorMessage(registerError);

      setFormError(errorMessage);
    }
  };

  const handleSubmit = () => {
    if (isRegisterMode) {
      if (registrationStep < 3) {
        handleRegisterNext();
        return;
      }

      handleRegister();
      return;
    }

    handleLogin();
  };

  const handleCreateAccountPress = () => {
    const nextRegisterMode = !isRegisterMode;

    setIsRegisterMode(nextRegisterMode);
    setRegistrationStep(1);
    setFormError(null);
    clearFormSuccess();
    setFieldErrors({});
    resetEmailVerificationState();
    clearError();
  };

  const handleGoogleLogin = async () => {
    if (isGoogleLoading) {
      return;
    }

    setFormError(null);
    clearFormSuccess();
    clearError();
    setIsGoogleLoading(true);

    try {
      await signInWithGoogle();
      // Root auth guard routes to onboarding/dashboard once the session is established.
    } catch (googleError) {
      setFormError(getApiErrorMessage(googleError));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[Colors.bgGradientStart, Colors.bgGradientEnd]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle={Colors.statusBarStyle} backgroundColor={Colors.bgGradientStart} />
      <View pointerEvents="none" style={styles.floralArtwork}>
        <Image
          resizeMode="contain"
          source={require("../../assets/images/auth/floral-line-art.png")}
          style={styles.floralArtworkImage}
        />
      </View>

      {/* ── Background Glow Blobs ── */}
      <View pointerEvents="none" style={styles.blurContainer}>
        {/* Soft sage glow top left */}
        <LinearGradient
          colors={["rgba(28, 25, 23, 0.08)", "transparent"]}
          style={[styles.glowBlob, styles.glowPista]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        {/* Soft gold glow bottom right */}
        <LinearGradient
          colors={["rgba(175, 167, 157, 0.14)", "transparent"]}
          style={[styles.glowBlob, styles.glowCream]}
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
        />
      </View>

      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            ref={scrollViewRef}
            scrollEnabled={shouldEnableScroll}
            bounces={false}
            alwaysBounceVertical={false}
            overScrollMode="never"
            onLayout={(event) => setScrollViewHeight(event.nativeEvent.layout.height)}
            onContentSizeChange={(_, contentHeight) => setScrollContentHeight(contentHeight)}
            contentContainerStyle={[
              styles.scrollContainer,
              isRegisterMode && styles.registrationScrollContainer,
            ]}
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: cardOpacity,
                  transform: [{ scale: cardScale }],
                },
              ]}
            >
            {/* Branding Section */}
            <View style={styles.brandContainer}>
              <Text style={styles.logoText}>
                {isRegisterMode ? "Create Your Account" : "Welcome Back"}
              </Text>

              <Text style={styles.tagline}>
                {isRegisterMode
                  ? "Start managing your salon in minutes."
                  : "Sign in to continue managing your salon."}
              </Text>
            </View>

            {isRegisterMode && (
              <View style={styles.stepHeader}>
                <View style={styles.progressSteps}>
                  {([1, 2, 3] as RegisterStep[]).map((step, index) => {
                    const isCompleted = registrationStep > step;
                    const isActive = registrationStep === step;
                    const isLineCompleted = registrationStep > step;

                    return (
                      <View key={step} style={styles.progressStepGroup}>
                        <View style={styles.progressStepItem}>
                          <View
                            style={[
                              styles.progressCircle,
                              isCompleted && styles.progressCircleCompleted,
                              isActive && styles.progressCircleActive,
                            ]}
                          >
                            {isCompleted ? (
                              <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                            ) : (
                              <Text
                                style={[
                                  styles.progressCircleText,
                                  isActive && styles.progressCircleTextActive,
                                ]}
                              >
                                {step}
                              </Text>
                            )}
                          </View>
                          <Text
                            style={[
                              styles.progressLabel,
                              (isActive || isCompleted) && styles.progressLabelActive,
                            ]}
                            numberOfLines={2}
                          >
                            {REGISTER_STEP_TITLES[step]}
                          </Text>
                        </View>
                        {index < 2 && (
                          <View
                            style={[
                              styles.progressLine,
                              isLineCompleted && styles.progressLineCompleted,
                            ]}
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
                <Text style={styles.stepTitle}>
                  {REGISTER_STEP_TITLES[registrationStep]}
                </Text>
              </View>
            )}

            {isRegisterMode && registrationStep === 1 && (
              /* Full Name Field */
              <View
                onLayout={(event) =>
                  registerFieldPosition("fullName", event.nativeEvent.layout.y)
                }
                style={styles.inputGroup}
              >
                <Text style={styles.inputLabel}>Full Name</Text>
                <View
                  style={[
                    styles.inputContainer,
                    fieldErrors.fullName && styles.inputContainerError,
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={Colors.secondary}
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Full name"
                    placeholderTextColor={Colors.placeholder}
                    value={fullName}
                    onChangeText={handleFullNameChange}
                    textContentType="name"
                    autoComplete="name"
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
                {fieldErrors.fullName && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.fullName}</Text>
                )}
              </View>
            )}

            {(!isRegisterMode || registrationStep === 1) && (
              /* Email Field */
              <View
                onLayout={(event) => {
                  if (isRegisterMode) {
                    registerFieldPosition("email", event.nativeEvent.layout.y);
                  }
                }}
                style={styles.inputGroup}
              >
                <Text style={styles.inputLabel}>Email Address</Text>
                <View
                  style={[
                    styles.inputContainer,
                    isRegisterMode && fieldErrors.email && styles.inputContainerError,
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={Colors.secondary}
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="name@company.com"
                    placeholderTextColor={Colors.placeholder}
                    value={email}
                    onChangeText={handleEmailChange}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
                {isRegisterMode && fieldErrors.email && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text>
                )}
                {isRegisterMode && (
                  <View style={styles.emailVerificationPanel}>
                    {isEmailVerifiedForCurrentEmail ? (
                      <View style={styles.emailVerifiedRow}>
                        <Ionicons name="checkmark-circle-outline" size={18} color={Colors.success} />
                        <Text style={styles.emailVerifiedText}>Email Verified</Text>
                      </View>
                    ) : (
                      <>
                        {!isEmailOtpSent && (
                        <Pressable
                          disabled={isEmailOtpBusy}
                          onPress={handleSendEmailOtp}
                          style={[
                            styles.emailVerificationButton,
                            isEmailOtpBusy && styles.emailVerificationButtonDisabled,
                          ]}
                        >
                          {isSendingEmailOtp ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                            <>
                              <Ionicons name="shield-checkmark-outline" size={17} color="#FFFFFF" />
                              <Text style={styles.emailVerificationButtonText}>
                                Verify Email
                              </Text>
                            </>
                          )}
                        </Pressable>
                        )}

                        {isEmailOtpSent && (
                          <View style={styles.emailOtpInlineCard}>
                            <Text style={styles.emailOtpTitle}>Enter Email OTP</Text>
                            <Text style={styles.emailOtpDescription}>
                              We sent a verification code to {email.trim()}.
                            </Text>

                            <View
                              style={[
                                styles.inputContainer,
                                styles.emailOtpInputContainer,
                                emailOtpError && styles.inputContainerError,
                              ]}
                            >
                              <Ionicons
                                name="keypad-outline"
                                size={20}
                                color={Colors.secondary}
                                style={{ marginRight: 12 }}
                              />
                              <TextInput
                                autoComplete="one-time-code"
                                keyboardType="number-pad"
                                maxLength={8}
                                onChangeText={handleEmailOtpChange}
                                onSubmitEditing={handleVerifyEmailOtp}
                                placeholder="Enter OTP"
                                placeholderTextColor={Colors.placeholder}
                                returnKeyType="done"
                                style={styles.textInput}
                                textContentType="oneTimeCode"
                                value={emailOtp}
                              />
                            </View>

                            {emailOtpError && (
                              <Text style={styles.fieldErrorText}>{emailOtpError}</Text>
                            )}

                            {emailOtpSuccess && (
                              <View style={styles.emailOtpSuccessRow}>
                                <Ionicons
                                  name="checkmark-circle-outline"
                                  size={15}
                                  color={Colors.success}
                                />
                                <Text style={styles.emailOtpSuccessText}>{emailOtpSuccess}</Text>
                              </View>
                            )}

                            <View style={styles.emailOtpActions}>
                              <Pressable
                                disabled={isEmailOtpBusy}
                                onPress={handleVerifyEmailOtp}
                                style={[
                                  styles.emailOtpVerifyButton,
                                  isEmailOtpBusy && styles.emailVerificationButtonDisabled,
                                ]}
                              >
                                {isVerifyingEmailOtp ? (
                                  <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                  <Text style={styles.emailOtpVerifyButtonText}>Verify OTP</Text>
                                )}
                              </Pressable>

                              <Pressable
                                disabled={isEmailOtpBusy || isEmailOtpCooldownActive}
                                onPress={handleResendEmailOtp}
                                style={styles.emailOtpResendButton}
                              >
                                <Text
                                  style={[
                                    styles.emailOtpResendText,
                                    (isEmailOtpBusy || isEmailOtpCooldownActive) &&
                                      styles.emailOtpResendTextDisabled,
                                  ]}
                                >
                                  {isSendingEmailOtp
                                    ? "Resending..."
                                    : isEmailOtpCooldownActive
                                      ? `Resend in ${emailOtpCountdown}`
                                      : "Resend OTP"}
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                )}
              </View>
            )}

            {isRegisterMode && registrationStep === 1 && (
              /* Phone Field */
              <View
                onLayout={(event) =>
                  registerFieldPosition("phone", event.nativeEvent.layout.y)
                }
                style={styles.inputGroup}
              >
                <Text style={styles.inputLabel}>Mobile Number</Text>
                <PhoneInput
                  value={phoneE164}
                  onChange={handlePhoneChange}
                  error={fieldErrors.phone}
                  onBlur={() => {
                    const stepErrors = getRegisterStepErrors(1);
                    if (stepErrors.phone) {
                      setFieldErrors((currentErrors) => ({
                        ...currentErrors,
                        phone: stepErrors.phone,
                      }));
                    } else {
                      setFieldErrors((currentErrors) => {
                        const nextErrors = { ...currentErrors };
                        delete nextErrors.phone;
                        return nextErrors;
                      });
                    }
                  }}
                />
              </View>
            )}

            {isRegisterMode && registrationStep === 2 && (
              /* Business Name Field */
              <View
                onLayout={(event) =>
                  registerFieldPosition("businessName", event.nativeEvent.layout.y)
                }
                style={styles.inputGroup}
              >
                <Text style={styles.inputLabel}>Business Name</Text>
                <View
                  style={[
                    styles.inputContainer,
                    fieldErrors.businessName && styles.inputContainerError,
                  ]}
                >
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={Colors.secondary}
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Business name"
                    placeholderTextColor={Colors.placeholder}
                    value={businessName}
                    onChangeText={handleBusinessNameChange}
                    textContentType="organizationName"
                    autoComplete="organization"
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
                {fieldErrors.businessName && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.businessName}</Text>
                )}
              </View>
            )}

            {isRegisterMode && registrationStep === 2 && (
              /* Address Field & Map Preview System */
              <View
                onLayout={(event) =>
                  registerFieldPosition("address", event.nativeEvent.layout.y)
                }
                style={styles.inputGroup}
              >
                <Text style={styles.inputLabel}>Business Address</Text>

                {/* Toggle search suggestions or manual typing */}
                {!isManualEntry ? (
                  <>
                    <AddressAutocomplete
                      onAddressSelected={handleAddressSelected}
                      onError={handleLocationError}
                      initialValue={address}
                    />

                    <CurrentLocationButton
                      onLocationFetched={handleAddressSelected}
                      onError={handleLocationError}
                    />

                    <Pressable
                      onPress={() => {
                        setIsManualEntry(true);
                        setPlaceId("manual_entry");
                        setLatitude(0);
                        setLongitude(0);
                        clearRegisterFieldError("address");
                      }}
                      style={styles.manualEntryToggle}
                    >
                      <Text style={styles.manualEntryToggleText}>
                        {"Can't find your address? Enter details manually"}
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    onPress={() => {
                      setIsManualEntry(false);
                      setPlaceId("");
                      setLatitude(null);
                      setLongitude(null);
                    }}
                    style={styles.manualEntryToggle}
                  >
                    <Text style={styles.manualEntryToggleText}>
                      ← Switch back to maps search
                    </Text>
                  </Pressable>
                )}

                {/* Draggable Map Preview */}
                {!isManualEntry && latitude !== null && longitude !== null && (
                  <GoogleMapPreview
                    latitude={latitude}
                    longitude={longitude}
                    onAddressUpdated={handleAddressSelected}
                  />
                )}

                {/* Form fields for manual validation & adjustment */}
                {(isManualEntry || address.length > 0) && (
                  <View style={styles.detailsContainer}>
                    <Text style={styles.detailsHeader}>Verify & Edit Address Details</Text>

                    {/* Address Line 1 */}
                    <View style={styles.detailInputGroup}>
                      <Text style={styles.detailLabel}>Address Line 1</Text>
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Street address, floor, suite"
                          placeholderTextColor={Colors.placeholder}
                          value={addressLine1}
                          onChangeText={(val) => {
                            setAddressLine1(val);
                            updateFormattedAddress(val, area, city, state, postalCode);
                          }}
                        />
                      </View>
                    </View>

                    {/* Area / Locality */}
                    <View style={styles.detailInputGroup}>
                      <Text style={styles.detailLabel}>Area / Locality</Text>
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Neighborhood, sector, district"
                          placeholderTextColor={Colors.placeholder}
                          value={area}
                          onChangeText={(val) => {
                            setArea(val);
                            updateFormattedAddress(addressLine1, val, city, state, postalCode);
                          }}
                        />
                      </View>
                    </View>

                    {/* City */}
                    <View style={styles.detailInputGroup}>
                      <Text style={styles.detailLabel}>City</Text>
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="City name"
                          placeholderTextColor={Colors.placeholder}
                          value={city}
                          onChangeText={(val) => {
                            setCity(val);
                            updateFormattedAddress(addressLine1, area, val, state, postalCode);
                          }}
                        />
                      </View>
                    </View>

                    {/* State */}
                    <View style={styles.detailInputGroup}>
                      <Text style={styles.detailLabel}>State / Region</Text>
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="State or province"
                          placeholderTextColor={Colors.placeholder}
                          value={state}
                          onChangeText={(val) => {
                            setState(val);
                            updateFormattedAddress(addressLine1, area, city, val, postalCode);
                          }}
                        />
                      </View>
                    </View>

                    {/* Postal Code */}
                    <View style={styles.detailInputGroup}>
                      <Text style={styles.detailLabel}>Postal Code / ZIP</Text>
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Postal code"
                          placeholderTextColor={Colors.placeholder}
                          value={postalCode}
                          onChangeText={(val) => {
                            setPostalCode(val);
                            updateFormattedAddress(addressLine1, area, city, state, val);
                          }}
                        />
                      </View>
                      {!postalCode && (
                        <View style={styles.warningRow}>
                          <Ionicons name="warning-outline" size={13} color={Colors.warning} />
                          <Text style={styles.warningText}>
                            Saving without a postal code is allowed, but not recommended.
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Error Banner */}
                {fieldErrors.address && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.address}</Text>
                )}
              </View>
            )}

            {(!isRegisterMode || registrationStep === 3) && (
              /* Password Field */
              <View
                onLayout={(event) => {
                  if (isRegisterMode) {
                    registerFieldPosition("password", event.nativeEvent.layout.y);
                  }
                }}
                style={styles.inputGroup}
              >
                <Text style={styles.inputLabel}>Password</Text>
                <View
                  style={[
                    styles.inputContainer,
                    isRegisterMode && fieldErrors.password && styles.inputContainerError,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={Colors.secondary}
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your password"
                    placeholderTextColor={Colors.placeholder}
                    value={password}
                    onChangeText={handlePasswordChange}
                    secureTextEntry={!showPassword}
                    textContentType="password"
                    autoComplete="password"
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}
                    hitSlop={12}
                  >
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color={Colors.secondary}
                      style={styles.eyeIcon}
                    />
                  </Pressable>
                </View>
                {isRegisterMode && fieldErrors.password && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.password}</Text>
                )}
              </View>
            )}

            {isRegisterMode && registrationStep === 3 && (
              <>
                {/* Confirm Password Field */}
                <View
                  onLayout={(event) =>
                    registerFieldPosition("confirmPassword", event.nativeEvent.layout.y)
                  }
                  style={styles.inputGroup}
                >
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      fieldErrors.confirmPassword && styles.inputContainerError,
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={Colors.secondary}
                      style={{ marginRight: 12 }}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Confirm your password"
                      placeholderTextColor={Colors.placeholder}
                      value={confirmPassword}
                      onChangeText={handleConfirmPasswordChange}
                      secureTextEntry={!showPassword}
                      textContentType="password"
                      autoComplete="password"
                      autoCapitalize="none"
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.passwordToggle}
                      hitSlop={12}
                    >
                      <Ionicons
                        name={showPassword ? "eye-outline" : "eye-off-outline"}
                        size={20}
                        color={Colors.secondary}
                        style={styles.eyeIcon}
                      />
                    </Pressable>
                  </View>
                  {fieldErrors.confirmPassword && (
                    <Text style={styles.fieldErrorText}>{fieldErrors.confirmPassword}</Text>
                  )}
                </View>

                {/* Terms Field */}
                <Pressable
                  onLayout={(event) =>
                    registerFieldPosition("terms", event.nativeEvent.layout.y)
                  }
                  onPress={handleTermsPress}
                  style={styles.termsRow}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: termsAccepted }}
                >
                  <View
                    style={[
                      styles.checkbox,
                      fieldErrors.terms && styles.checkboxError,
                      termsAccepted && styles.checkboxChecked,
                    ]}
                  >
                    {termsAccepted && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={styles.termsText}>
                    I agree to the Terms & Conditions
                  </Text>
                </Pressable>
                {fieldErrors.terms && (
                  <Text style={[styles.fieldErrorText, styles.termsErrorText]}>
                    {fieldErrors.terms}
                  </Text>
                )}
              </>
            )}

            {!isRegisterMode && displayedSuccess && (
              <View style={styles.successContainer} accessibilityRole="alert">
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color={Colors.success}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.successText}>{displayedSuccess}</Text>
              </View>
            )}

            {(formError || error) && (
              <View style={styles.errorContainer} accessibilityRole="alert">
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={Colors.error}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.errorText}>{formError ?? error}</Text>
              </View>
            )}

            {!isRegisterMode && (
              <View style={styles.loginOptionsRow}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: rememberMe }}
                  onPress={() => setRememberMe((current) => !current)}
                  style={styles.rememberRow}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe ? <Ionicons color="#FFFFFF" name="checkmark" size={15} /> : null}
                  </View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push("/forgot-password")}
                  style={styles.forgotPassword}
                >
                  <Text
                    style={[
                      styles.forgotPasswordText,
                      failedLoginAttempts >= 3 && styles.forgotPasswordTextEmphasized,
                    ]}
                  >
                    Forgot password?
                  </Text>
                </Pressable>
              </View>
            )}

            {isRegisterMode && registrationStep > 1 && (
              <Pressable
                onPress={handleRegisterBack}
                disabled={isLoading}
                style={styles.backButton}
              >
                <Ionicons
                  name="chevron-back-outline"
                  size={18}
                  color={Colors.secondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
            )}

            {/* Login Button */}
            <Animated.View style={{ transform: [{ scale: signInScale }] }}>
              <Pressable
                onPress={handleSubmit}
                disabled={isLoading}
                onPressIn={() => handlePressIn(signInScale)}
                onPressOut={() => handlePressOut(signInScale)}
                style={[
                  styles.submitButtonWrapper,
                  isLoading && styles.submitButtonDisabled,
                ]}
              >
                <View style={styles.submitButton}>
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {isRegisterMode
                        ? registrationStep < 3
                          ? "Next"
                          : "Get Started"
                        : "Log In"}
                    </Text>
                  )}
                </View>
              </Pressable>
            </Animated.View>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>
                {isRegisterMode ? "Or sign up with" : "Or continue with"}
              </Text>
              <View style={styles.dividerLine} />
            </View>

            <Animated.View style={{ transform: [{ scale: googleScale }] }}>
              <Pressable
                disabled={isGoogleLoading}
                onPress={handleGoogleLogin}
                onPressIn={() => handlePressIn(googleScale)}
                onPressOut={() => handlePressOut(googleScale)}
                style={[styles.googleButton, isGoogleLoading && styles.googleButtonDisabled]}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator color={Colors.primary} size="small" />
                ) : (
                  <Image
                    source={require("../../assets/images/google-logo.png")}
                    style={styles.googleIcon}
                    resizeMode="contain"
                  />
                )}
              </Pressable>
            </Animated.View>

            {/* Bottom Row */}
            <Pressable
              onPress={handleCreateAccountPress}
              style={styles.createAccountRow}
            >
              <Text style={styles.createAccountText}>
                {isRegisterMode ? "Already have an account? " : "Don't have an account? "}
                <Text style={styles.createAccountHighlight}>
                  {isRegisterMode ? "Log in" : "Create account"}
                </Text>
              </Text>
            </Pressable>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const createStyles = (Colors: AuthColors) => StyleSheet.create({
  container: {
    backgroundColor: Colors.bgGradientStart,
    flex: 1,
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  glowBlob: {
    position: "absolute",
    borderRadius: 999,
  },
  glowPista: {
    height: 420,
    left: -140,
    top: -130,
    width: 420,
  },
  glowCream: {
    bottom: -140,
    height: 360,
    right: -110,
    width: 360,
  },
  keyboardView: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: "flex-start",
    flexShrink: 0,
    paddingHorizontal: 24,
    paddingVertical: 8,
    zIndex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  registrationScrollContainer: {
    justifyContent: "flex-start",
    paddingTop: 24,
  },
  floralArtwork: {
    height: 245,
    opacity: 0.34,
    position: "absolute",
    right: -52,
    top: 14,
    width: 275,
  },
  floralArtworkImage: {
    height: "100%",
    tintColor: Colors.accent,
    width: "100%",
  },
  card: {
    backgroundColor: "transparent",
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoImage: {
    width: 64,
    height: 64,
    marginBottom: 12,
  },
  logoText: {
    fontFamily: "Georgia",
    fontSize: 40,
    fontWeight: "400",
    color: Colors.text,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  logoAccent: {
    color: Colors.accent,
    fontWeight: "800",
  },
  tagline: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginTop: 8,
    letterSpacing: 0,
    textAlign: "center",
  },
  googleButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    height: 62,
    width: 62,
    alignSelf: "center",
    borderRadius: 31,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 18,
  },
  googleIcon: {
    width: 25,
    height: 25,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
    letterSpacing: 0,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.inputBorder,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    fontWeight: "400",
    color: Colors.textSecondary,
    letterSpacing: 0,
  },
  inputGroup: {
    marginBottom: 16,
  },
  emailVerificationPanel: {
    marginTop: 10,
  },
  emailVerificationButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.primary,
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emailVerificationButtonDisabled: {
    opacity: 0.68,
  },
  emailVerificationButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  emailVerifiedRow: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.successBg,
    borderColor: Colors.successBorder,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  emailVerifiedText: {
    color: Colors.success,
    fontSize: 13,
    fontWeight: "800",
  },
  emailOtpInlineCard: {
    backgroundColor: Colors.cardBg,
    borderColor: Colors.cardBorder,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  emailOtpTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  emailOtpDescription: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    marginBottom: 10,
  },
  emailOtpInputContainer: {
    height: 48,
  },
  emailOtpSuccessRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  emailOtpSuccessText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: "700",
  },
  emailOtpActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 12,
  },
  emailOtpVerifyButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 14,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
  },
  emailOtpVerifyButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  emailOtpResendButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 4,
  },
  emailOtpResendText: {
    color: Colors.secondary,
    fontSize: 13,
    fontWeight: "800",
  },
  emailOtpResendTextDisabled: {
    color: Colors.textSecondary,
    opacity: 0.72,
  },
  inputLabel: {
    display: "none",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 16,
    height: 52,
  },
  inputContainerError: {
    borderColor: Colors.error,
  },
  addressInputContainer: {
    alignItems: "flex-start",
    minHeight: 52,
    paddingVertical: 0,
  },
  phoneRow: {
    flexDirection: "row",
    gap: 10,
  },
  countryCodeSelector: {
    width: 88,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  countryCodeText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginRight: 6,
  },
  phoneInputContainer: {
    flex: 1,
  },

  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    height: "100%",
  },
  addressTextInput: {
    minHeight: 50,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  passwordToggle: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  eyeIcon: {
    opacity: 0.85,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderColor: Colors.errorBorder,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: -4,
    marginBottom: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.successBg,
    borderColor: Colors.successBorder,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: -4,
    marginBottom: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    color: Colors.error,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  successText: {
    flex: 1,
    color: Colors.success,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  fieldErrorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 6,
  },
  stepHeader: {
    alignItems: "center",
    marginBottom: 16,
    marginTop: -4,
    width: "100%",
  },
  progressSteps: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 12,
  },
  progressStepGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  progressStepItem: {
    alignItems: "center",
    width: 84,
  },
  progressCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.cardBg,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  progressCircleActive: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondary,
    transform: [{ scale: 1.08 }],
  },
  progressCircleCompleted: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent,
  },
  progressCircleText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  progressCircleTextActive: {
    color: "#FFFFFF",
  },
  progressLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
    paddingHorizontal: 4,
    textAlign: "center",
    lineHeight: 16,
    width: 84,
  },
  progressLabelActive: {
    color: Colors.secondary,
  },
  progressLine: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    backgroundColor: Colors.inputBorder,
    marginTop: 19,
    marginHorizontal: 2,
  },
  progressLineCompleted: {
    backgroundColor: Colors.accent,
  },
  stepTitle: {
    color: Colors.text,
    fontFamily: "Georgia",
    fontSize: 28,
    fontWeight: "400",
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -4,
    marginBottom: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.inputBorderFocus,
    backgroundColor: Colors.inputBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  checkboxError: {
    borderColor: Colors.error,
  },
  termsText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  termsErrorText: {
    marginTop: -14,
    marginBottom: 16,
    marginLeft: 32,
  },
  forgotPassword: {
    alignSelf: "center",
  },
  loginOptionsRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    marginTop: 2,
  },
  rememberRow: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 44,
  },
  rememberText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.secondary,
  },
  forgotPasswordTextEmphasized: {
    fontWeight: "800",
    color: Colors.primaryDark,
  },
  backButton: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  backButtonText: {
    color: Colors.secondary,
    fontSize: 14,
    fontWeight: "700",
  },
  submitButtonWrapper: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
    marginBottom: 0,
  },
  submitButtonDisabled: {
    opacity: 0.72,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0,
  },
  createAccountRow: {
    alignItems: "center",
    paddingVertical: 4,
  },
  createAccountText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  createAccountHighlight: {
    color: Colors.accentDark,
    fontWeight: "700",
  },
  manualEntryToggle: {
    paddingVertical: 8,
    marginTop: 4,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  manualEntryToggleText: {
    color: Colors.secondary,
    fontSize: 13,
    fontWeight: "600",
  },
  detailsContainer: {
    width: "100%",
    marginTop: 14,
    borderTopWidth: 1.5,
    borderTopColor: Colors.cardBorder,
    paddingTop: 16,
  },
  detailsHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 14,
  },
  detailInputGroup: {
    marginBottom: 14,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  warningRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 5,
    marginTop: 4,
  },
  warningText: {
    color: Colors.warning,
    flex: 1,
    fontSize: 11,
    fontWeight: "500",
  },
});
