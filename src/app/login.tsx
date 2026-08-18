import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { KeyboardAwareScrollView, type KeyboardAwareScrollViewHandle } from "@/components/ui/KeyboardAwareScrollView";
import { ApiError, getApiErrorMessage } from "@/services/api";
import type { ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/theme/ThemeProvider";
import { resolveLoginRoute } from "@/utils/routeResolver";
import { EMAIL_INVALID_MESSAGE, isValidEmail } from "@/utils/validation";

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

export default function LoginScreen() {
  const Colors = useAuthColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const params = useLocalSearchParams<{ successMessage?: string }>();
  const routeSuccessMessage = getRouteParam(params.successMessage);
  const { clearError, error, isLoading, signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [activeKeyboardFieldRef, setActiveKeyboardFieldRef] =
    useState<RefObject<TextInput | null> | null>(null);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [scrollContentHeight, setScrollContentHeight] = useState(0);
  const scrollViewRef = useRef<KeyboardAwareScrollViewHandle | null>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
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
  const keyboardNavigationFields = useMemo(
    () => [{ ref: emailInputRef }, { ref: passwordInputRef }],
    [],
  );

  const handleKeyboardFieldFocus = (fieldRef: RefObject<TextInput | null>) => {
    setActiveKeyboardFieldRef(fieldRef);
  };

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

  const handleEmailChange = (nextEmail: string) => {
    setEmail(nextEmail);
    setFormError(null);
    clearFormSuccess();
    clearError();
    setFailedLoginAttempts(0);
  };

  const handlePasswordChange = (nextPassword: string) => {
    setPassword(nextPassword);
    setFormError(null);
    clearFormSuccess();
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

  const handleSubmit = () => {
    handleLogin();
  };

  // SCRUM-1838: self-registration removed from the mobile app. The "Create
  // account" link stays visible in the UI (per product decision) but is now
  // inert — tapping it does nothing. New salons are provisioned some other
  // way; see AuthContext's still-intact signUp()/authService.register() if
  // this ever needs to come back.
  const handleCreateAccountPress = () => {};

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
      // Root auth guard routes to the correct dashboard/home once the session is established.
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
        <KeyboardAwareScrollView
          ref={scrollViewRef as any}
          scrollEnabled={shouldEnableScroll}
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          onLayout={(event) => setScrollViewHeight(event.nativeEvent.layout.height)}
          onContentSizeChange={(_, contentHeight) => setScrollContentHeight(contentHeight)}
          contentContainerStyle={styles.scrollContainer}
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.keyboardView}
          keyboardNavigation={{
            activeFieldRef: activeKeyboardFieldRef,
            fields: keyboardNavigationFields,
            hideOnLast: true,
            keyboardVisible: isKeyboardVisible,
            onDone: handleSubmit,
          }}
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
              <Text style={styles.logoText}>Welcome Back</Text>

              <Text style={styles.tagline}>Sign in to continue managing your salon.</Text>
            </View>

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={Colors.secondary}
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  ref={emailInputRef}
                  style={styles.textInput}
                  placeholder="name@company.com"
                  placeholderTextColor={Colors.placeholder}
                  value={email}
                  onChangeText={handleEmailChange}
                  onFocus={() => handleKeyboardFieldFocus(emailInputRef)}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={Colors.secondary}
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  ref={passwordInputRef}
                  style={styles.textInput}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.placeholder}
                  value={password}
                  onChangeText={handlePasswordChange}
                  onFocus={() => handleKeyboardFieldFocus(passwordInputRef)}
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
            </View>

            {displayedSuccess && (
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
                    <Text style={styles.submitButtonText}>Log In</Text>
                  )}
                </View>
              </Pressable>
            </Animated.View>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or continue with</Text>
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

            {/* Bottom Row — SCRUM-1838: self-registration removed, but this
                link stays visible per product decision; handleCreateAccountPress is now a no-op. */}
            <Pressable
              onPress={handleCreateAccountPress}
              style={styles.createAccountRow}
            >
              <Text style={styles.createAccountText}>
                Don&apos;t have an account?{" "}
                <Text style={styles.createAccountHighlight}>Create account</Text>
              </Text>
            </Pressable>
            </Animated.View>
        </KeyboardAwareScrollView>
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
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
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
  logoText: {
    fontFamily: "Georgia",
    fontSize: 40,
    fontWeight: "400",
    color: Colors.text,
    letterSpacing: -0.5,
    textAlign: "center",
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
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    height: "100%",
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
});
