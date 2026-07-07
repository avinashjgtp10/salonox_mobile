import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
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

import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/services/api";
import { authService } from "@/services/authService";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─── Color Palette ───────────────────────────────────────────
const Colors = {
  bgGradientStart: "#FAFBFA",
  bgGradientEnd: "#F4F7F5",
  primary: "#496A5D",
  primaryDark: "#365046",
  secondary: "#6D8F81",
  accent: "#C7A86D",
  accentDark: "#B18F54",
  text: "#243B34",
  textPrimary: "#445B55",
  textSecondary: "#7A8D87",
  placeholder: "#A8B7B1",
  cardBg: "#FFFFFF",
  cardBorder: "#E3E8E5",
  inputBg: "#FFFFFF",
  inputBorder: "#E3E8E5",
  inputBorderFocus: "#496A5D",
  error: "#D65B5B",
  errorBg: "rgba(214, 91, 91, 0.08)",
  success: "#4B8F68",
  warning: "#D8A84F",
};

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);
const isValidMobileNumber = (value: string) => /^\d{10}$/.test(value);
const isValidPassword = (value: string) => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value);
const DEFAULT_COUNTRY = "India";
const getRouteParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const getFriendlyLoginErrorMessage = (loginError: unknown) => {
  const rawMessage = getApiErrorMessage(loginError);
  const attemptsMatch = rawMessage.match(/Attempts left:\s*\d+/i);
  const hasInvalidCredentials =
    /INVALID_CREDENTIALS/i.test(rawMessage) || /Invalid credentials/i.test(rawMessage);

  if (hasInvalidCredentials) {
    return [
      "The email or password you entered is incorrect.",
      attemptsMatch?.[0],
    ]
      .filter(Boolean)
      .join("\n");
  }

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
  const params = useLocalSearchParams<{ successMessage?: string }>();
  const routeSuccessMessage = getRouteParam(params.successMessage);
  const { clearError, error, isLoading, signIn, signInWithGoogle, signUp } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<RegisterStep>(1);
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [dismissedRouteSuccessMessage, setDismissedRouteSuccessMessage] = useState<string | null>(
    null,
  );
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
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

  const clearFormSuccess = () => {
    setFormSuccess(null);

    if (routeSuccessMessage) {
      setDismissedRouteSuccessMessage(routeSuccessMessage);
    }
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
    setEmail(nextEmail);
    setFormError(null);
    clearFormSuccess();
    clearRegisterFieldError("email");
    clearError();
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

  const handleAddressChange = (nextAddress: string) => {
    setAddress(nextAddress);
    setFormError(null);
    clearFormSuccess();
    clearRegisterFieldError("address");
    clearError();
  };

  const handlePhoneChange = (nextPhone: string) => {
    setPhoneNumber(nextPhone.replace(/\D/g, ""));
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

    setFormError(null);
    clearFormSuccess();

    try {
      const authData = await signIn({ email: trimmedEmail, password });

      if (authData.isOnboardingComplete) {
        router.replace("/dashboard" as Href);
      } else {
        router.replace("/onboarding" as Href);
      }
    } catch (loginError) {
      const errorMessage = getFriendlyLoginErrorMessage(loginError);

      setFormError(errorMessage);
    }
  };

  const getRegisterPayload = () => ({
      fullName: fullName.trim(),
      businessName: businessName.trim(),
      address: address.trim(),
      email: email.trim(),
      country: DEFAULT_COUNTRY,
      countryCode,
      phone: phoneNumber.trim(),
      password,
      terms: termsAccepted,
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
        nextFieldErrors.email = "Please enter a valid email address.";
      }

      if (!registerPayload.phone) {
        nextFieldErrors.phone = "Mobile Number is required.";
      } else if (!isValidMobileNumber(registerPayload.phone)) {
        nextFieldErrors.phone = "Please enter a valid 10-digit mobile number.";
      }
    }

    if (step === 2) {
      if (!registerPayload.businessName) {
        nextFieldErrors.businessName = "Business Name is required.";
      }

      if (!registerPayload.address) {
        nextFieldErrors.address = "Address is required.";
      }
    }

    if (step === 3) {
      if (!registerPayload.password) {
        nextFieldErrors.password = "Password is required.";
      } else if (!isValidPassword(registerPayload.password)) {
        nextFieldErrors.password =
          "Password must be at least 8 characters and contain letters and numbers.";
      }

      if (!confirmPassword) {
        nextFieldErrors.confirmPassword = "Confirm Password is required.";
      } else if (registerPayload.password !== confirmPassword) {
        nextFieldErrors.confirmPassword = "Confirm Password must match Password.";
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

  const handleRegisterNext = () => {
    if (!validateRegisterStep(registrationStep)) {
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
      const authData = await signUp(registerPayload);

      if (authData.user?.isVerified === false) {
        const registeredEmail = registerPayload.email;

        // Best-effort: kick off email verification, but never block registration on it.
        try {
          await authService.sendEmailOtp({ email: registeredEmail });
        } catch (otpError) {
          console.warn("[Auth] Failed to send email verification OTP", getApiErrorMessage(otpError));
        }

        router.replace({
          pathname: "/verify-email",
          params: { email: registeredEmail },
        });
      }
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
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgGradientStart} />

      {/* ── Background Glow Blobs ── */}
      <View pointerEvents="none" style={styles.blurContainer}>
        {/* Soft sage glow top left */}
        <LinearGradient
          colors={["rgba(73, 106, 93, 0.12)", "transparent"]}
          style={[styles.glowBlob, styles.glowPista]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        {/* Soft gold glow bottom right */}
        <LinearGradient
          colors={["rgba(199, 168, 109, 0.14)", "transparent"]}
          style={[styles.glowBlob, styles.glowCream]}
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
          contentContainerStyle={styles.scrollContainer}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="always"
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
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />

              <Text style={styles.logoText}>
                {isRegisterMode ? (
                  "Create Your Salon"
                ) : (
                  <>
                    Salon<Text style={styles.logoAccent}>OX</Text>
                  </>
                )}
              </Text>

              <Text style={styles.tagline}>
                {isRegisterMode
                  ? "Let's set up your business in less than a minute."
                  : "Smart Salon Management Platform"}
              </Text>
            </View>

            {/* Google Sign-In */}
            <Animated.View style={{ transform: [{ scale: googleScale }] }}>
              <Pressable
                disabled={isGoogleLoading}
                onPress={handleGoogleLogin}
                onPressIn={() => handlePressIn(googleScale)}
                onPressOut={() => handlePressOut(googleScale)}
                style={[styles.googleButton, isGoogleLoading && styles.googleButtonDisabled]}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator color={Colors.primary} size="small" style={styles.googleIcon} />
                ) : (
                  <Image
                    source={require("../../assets/images/google-logo.png")}
                    style={styles.googleIcon}
                    resizeMode="contain"
                  />
                )}
                <Text style={styles.googleButtonText}>
                  {isGoogleLoading ? "Connecting..." : "Continue with Google"}
                </Text>
              </Pressable>
            </Animated.View>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>
                {isRegisterMode ? "CREATE ACCOUNT WITH EMAIL" : "OR CONTINUE WITH EMAIL"}
              </Text>
              <View style={styles.dividerLine} />
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
                <View style={styles.phoneRow}>
                  <Pressable
                    style={[
                      styles.inputContainer,
                      styles.countryCodeSelector,
                      fieldErrors.phone && styles.inputContainerError,
                    ]}
                  >
                    <Text style={styles.countryCodeText}>{countryCode}</Text>
                    <Ionicons
                      name="chevron-down-outline"
                      size={16}
                      color={Colors.secondary}
                    />
                  </Pressable>
                  <View
                    style={[
                      styles.inputContainer,
                      styles.phoneInputContainer,
                      fieldErrors.phone && styles.inputContainerError,
                    ]}
                  >
                    <Ionicons
                      name="call-outline"
                      size={20}
                      color={Colors.secondary}
                      style={{ marginRight: 12 }}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="9876543210"
                      placeholderTextColor={Colors.placeholder}
                      value={phoneNumber}
                      onChangeText={handlePhoneChange}
                      keyboardType="number-pad"
                      textContentType="telephoneNumber"
                      autoComplete="tel"
                      returnKeyType="next"
                      maxLength={10}
                    />
                  </View>
                </View>
                {fieldErrors.phone && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.phone}</Text>
                )}
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
              /* Address Field */
              <View
                onLayout={(event) =>
                  registerFieldPosition("address", event.nativeEvent.layout.y)
                }
                style={styles.inputGroup}
              >
                <Text style={styles.inputLabel}>Business Address</Text>
                <View
                  style={[
                    styles.inputContainer,
                    styles.addressInputContainer,
                    fieldErrors.address && styles.inputContainerError,
                  ]}
                >
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={Colors.secondary}
                    style={{ marginRight: 12, marginTop: 16 }}
                  />
                  <TextInput
                    style={[styles.textInput, styles.addressTextInput]}
                    placeholder="Business address"
                    placeholderTextColor={Colors.placeholder}
                    value={address}
                    onChangeText={handleAddressChange}
                    textContentType="fullStreetAddress"
                    autoComplete="street-address"
                    autoCapitalize="words"
                    multiline
                    returnKeyType="next"
                  />
                </View>
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
              /* Forgot Password */
              <Pressable
                onPress={() => router.push("/forgot-password")}
                style={styles.forgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </Pressable>
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
                <LinearGradient
                  colors={[Colors.primaryDark, Colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButton}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {isRegisterMode
                        ? registrationStep < 3
                          ? "Next"
                          : "Create Account"
                        : "Sign In"}
                    </Text>
                  )}
                </LinearGradient>
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
                  {isRegisterMode ? "Sign In" : "Create Account"}
                </Text>
              </Text>
            </Pressable>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
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
    width: SCREEN_W * 1.2,
    height: SCREEN_W * 1.2,
    top: -SCREEN_H * 0.15,
    left: -SCREEN_W * 0.3,
  },
  glowCream: {
    width: SCREEN_W * 1.0,
    height: SCREEN_W * 1.0,
    bottom: -SCREEN_H * 0.15,
    right: -SCREEN_W * 0.2,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 70 : 44,
    paddingBottom: 40,
  },
  card: {
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 32,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoImage: {
    width: 64,
    height: 64,
    marginBottom: 12,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: 0.5,
  },
  logoAccent: {
    color: Colors.accent,
    fontWeight: "800",
  },
  tagline: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 6,
    letterSpacing: 0.2,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    height: 52,
    borderRadius: 18,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 24,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
    letterSpacing: 0.1,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.inputBorder,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBg,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 16,
    height: 54,
  },
  inputContainerError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorBg,
  },
  addressInputContainer: {
    alignItems: "flex-start",
    minHeight: 68,
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
    minHeight: 66,
    paddingTop: 12,
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
    borderColor: "rgba(214, 91, 91, 0.22)",
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
    backgroundColor: "rgba(75, 143, 104, 0.1)",
    borderColor: "rgba(75, 143, 104, 0.22)",
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
    marginBottom: 22,
    marginTop: -4,
    width: "100%",
  },
  progressSteps: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 14,
  },
  progressStepGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  progressStepItem: {
    alignItems: "center",
    width: 92,
  },
  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontSize: 9,
    fontWeight: "700",
    marginTop: 7,
    textAlign: "center",
    lineHeight: 12,
  },
  progressLabelActive: {
    color: Colors.secondary,
  },
  progressLine: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    backgroundColor: Colors.inputBorder,
    marginTop: 15,
    marginHorizontal: 2,
  },
  progressLineCompleted: {
    backgroundColor: Colors.accent,
  },
  stepTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "700",
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
    backgroundColor: Colors.errorBg,
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
    marginBottom: 26,
    marginTop: -4,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.secondary,
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
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
    marginBottom: 22,
  },
  submitButtonDisabled: {
    opacity: 0.72,
  },
  submitButton: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
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
});
