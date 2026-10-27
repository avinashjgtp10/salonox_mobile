import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { KeyboardAwareForm, type KeyboardAwareFormHandle } from "@/components/ui/KeyboardAwareForm";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { OpalGlassBackground } from "@/components/ui/OpalGlassBackground";
import { type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Pressable, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { ApiError, getApiErrorMessage } from "@/services/api";
import { resolveLoginRoute } from "@/utils/routeResolver";
import {
  EMAIL_INVALID_MESSAGE,
  isValidEmail,
} from "@/utils/validation";

const getRouteParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

const isInvalidCredentialsError = (loginError: unknown) => {
  const rawMessage = getApiErrorMessage(loginError);
  return /INVALID_CREDENTIALS/i.test(rawMessage) || /Invalid credentials/i.test(rawMessage);
};

const isAccountLockedError = (loginError: unknown) => loginError instanceof ApiError && loginError.status === 429;

const isEmailNotVerifiedError = (loginError: unknown) => {
  const rawMessage = getApiErrorMessage(loginError);
  return /EMAIL_NOT_VERIFIED/i.test(rawMessage) || /email.*not.*verif/i.test(rawMessage);
};

const getFriendlyLoginErrorMessage = (loginError: unknown) => {
  const rawMessage = getApiErrorMessage(loginError);
  const cleanedMessage = rawMessage.split("\n").map((line) => line.trim()).filter((line) => line && !/^[A-Z0-9_]+$/.test(line)).join("\n");
  return cleanedMessage || "We could not sign you in. Please try again.";
};

export default function LoginScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{ successMessage?: string }>();
  const routeSuccessMessage = getRouteParam(params.successMessage);
  const { clearError, error, isLoading, signIn } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const formRef = useRef<KeyboardAwareFormHandle>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const emailFieldRef = useRef<View>(null);
  const passwordFieldRef = useRef<View>(null);
  const loginInFlight = useRef(false);
  const [cardOpacity] = useState(() => new Animated.Value(0));
  const [cardTranslate] = useState(() => new Animated.Value(16));
  const canSubmit = Boolean(identifier.trim() && password);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, { duration: 300, toValue: 1, useNativeDriver: true }),
      Animated.spring(cardTranslate, { damping: 18, stiffness: 170, toValue: 0, useNativeDriver: true }),
    ]).start();
  }, [cardOpacity, cardTranslate]);

  const clearFeedback = () => {
    setFormError(null);
    clearError();
  };

  const focusPasswordField = () => passwordInputRef.current?.focus();
  const handleIdentifierChange = (value: string) => {
    setIdentifier(value);
    setFailedLoginAttempts(0);
    clearFeedback();
  };

  const handleLogin = async () => {
    if (isLoading || loginInFlight.current) return;
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier || !password) {
      setFormError("Please enter your email address and password.");
      return;
    }
    if (!isValidEmail(trimmedIdentifier)) {
      setFormError(EMAIL_INVALID_MESSAGE);
      return;
    }

    clearFeedback();
    try {
      loginInFlight.current = true;
      const email = trimmedIdentifier.toLowerCase();
      // Spaces are never part of a password (typed or pasted ones are stripped as they're entered).
      const authData = await signIn({ email, password: password.replace(/\s/g, "") });
      setFailedLoginAttempts(0);
      router.replace(resolveLoginRoute(authData));
    } catch (loginError) {
      if (isEmailNotVerifiedError(loginError)) {
        router.push({
          pathname: "/verify-email",
          params: {
            email: trimmedIdentifier.toLowerCase(),
            message: "Please verify your email to continue signing in.",
          },
        });
      } else if (isAccountLockedError(loginError)) {
        setFormError(getApiErrorMessage(loginError));
      } else if (isInvalidCredentialsError(loginError)) {
        const attempts = failedLoginAttempts + 1;
        setFailedLoginAttempts(attempts);
        setFormError(`Email or password is incorrect.${attempts >= 3 ? " Use Forgot Password below to reset it." : ""}`);
      } else {
        setFormError(getFriendlyLoginErrorMessage(loginError));
      }
    } finally {
      loginInFlight.current = false;
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={colors.dashboardTopBar} barStyle="light-content" />
      <KeyboardAwareForm ref={formRef} scrollEnabled={false}>
      <View pointerEvents="none" style={styles.hero}>
        <SafeAreaView edges={["top"]} style={styles.heroSafeArea}>
          <View style={styles.headerRow}>
            <View style={styles.wordmark}>
              <Image resizeMode="contain" source={require("../../assets/images/logo.png")} style={styles.logo} />
              <View style={styles.wordmarkCopy}>
                <View style={styles.wordmarkName}>
                  <Text style={styles.wordmarkText}>Salon</Text>
                  <Text style={styles.wordmarkAccent}>OX</Text>
                </View>
                <Text style={styles.wordmarkTagline}>Salon management, simplified</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <SafeAreaView edges={["bottom"]} style={styles.contentSafeArea}>
        <View style={styles.scrollContent}>
          <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardTranslate }] }]}>
            <OpalGlassBackground />
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your salon workspace</Text>

            <View ref={emailFieldRef} collapsable={false} style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputShell}>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  blurOnSubmit={false}
                  enterKeyHint="next"
                  keyboardType="email-address"
                  onChangeText={handleIdentifierChange}
                  onFocus={() => formRef.current?.revealField(emailFieldRef.current)}
                  onTouchEnd={() => formRef.current?.revealField(emailFieldRef.current)}
                  onSubmitEditing={focusPasswordField}
                  placeholder="Enter the registered email address"
                  placeholderTextColor={colors.placeholder}
                  returnKeyType="next"
                  style={styles.input}
                  submitBehavior="submit"
                  textContentType="emailAddress"
                  value={identifier}
                />
              </View>
            </View>

            <View ref={passwordFieldRef} collapsable={false} style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputShell}>
                <TextInput
                  // Keep the same native input mounted when toggling visibility:
                  // remounting dismisses the keyboard and resets the form scroll.
                  autoCapitalize="none"
                  autoComplete="password"
                  keyboardType="default"
                  // With the eye toggle on, the field is plain text: without these the
                  // keyboard autocorrects the password or appends a space after a
                  // suggestion, and the server rightly rejects it as wrong.
                  autoCorrect={false}
                  spellCheck={false}
                  // No spaces anywhere in the password: leading, trailing or internal,
                  // typed or pasted.
                  onChangeText={(value) => { setPassword(value.replace(/\s/g, "")); clearFeedback(); }}
                  onFocus={() => formRef.current?.revealField(passwordFieldRef.current)}
                  onTouchEnd={() => formRef.current?.revealField(passwordFieldRef.current)}
                  onSubmitEditing={handleLogin}
                  placeholder="Enter Password"
                  placeholderTextColor={colors.placeholder}
                  ref={passwordInputRef}
                  returnKeyType="done"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  textContentType="password"
                  value={password}
                />
                <Pressable accessibilityLabel={showPassword ? "Hide password" : "Show password"} hitSlop={12} onPress={() => setShowPassword((visible) => !visible)} style={styles.eyeButton}>
                  <Ionicons color={colors.text2} name={showPassword ? "eye-outline" : "eye-off-outline"} size={22} />
                </Pressable>
              </View>
            </View>

            {routeSuccessMessage ? <View style={styles.successBox}><Text style={styles.successText}>{routeSuccessMessage}</Text></View> : null}
            {formError || error ? <View accessibilityRole="alert" style={styles.errorBox}><Ionicons color={colors.error} name="alert-circle-outline" size={17} /><Text style={styles.errorText}>{formError ?? error}</Text></View> : null}

            <Pressable onPress={() => router.push("/forgot-password")} style={styles.forgotButton}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>

            <Pressable disabled={!canSubmit || isLoading} onPress={handleLogin} style={[styles.submitButton, (!canSubmit || isLoading) && styles.submitButtonDisabled]}>
              {isLoading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>Sign In</Text>}
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
      </KeyboardAwareForm>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.bg, flex: 1 },
  hero: { backgroundColor: colors.dashboardTopBar, height: 260, flexShrink: 0, overflow: "hidden" },
  heroSafeArea: { flex: 1 },
  headerRow: { alignItems: "center", flexDirection: "row", paddingHorizontal: 24, paddingTop: 24 },
  wordmark: { alignItems: "center", flex: 1, flexDirection: "row", minWidth: 0 },
  logo: { height: 54, width: 54 },
  wordmarkCopy: { marginLeft: 10, minWidth: 0 },
  wordmarkName: { alignItems: "baseline", flexDirection: "row" },
  wordmarkText: { color: colors.dashboardTopBarText, fontSize: 26, fontWeight: "800" },
  wordmarkAccent: { color: "#00D7A1", fontSize: 26, fontWeight: "800" },
  wordmarkTagline: { color: colors.dashboardTopBarMuted, fontSize: 10, marginTop: 3 },
  contentSafeArea: { flexGrow: 1, marginTop: -96, zIndex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 24, paddingHorizontal: 20 },
  card: { alignSelf: "center", width: "100%", maxWidth: 480, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 28, overflow: "hidden", paddingBottom: 28, paddingHorizontal: 24, paddingTop: 28 },
  title: { color: colors.heading, fontSize: 28, fontWeight: "800", textAlign: "center" },
  subtitle: { color: colors.text2, fontSize: 13, lineHeight: 20, marginTop: 6, marginBottom: 28, textAlign: "center" },
  fieldGroup: { marginBottom: 18 },
  label: { color: colors.text, fontSize: 13, fontWeight: "600", marginBottom: 8 },
  inputShell: { backgroundColor: colors.card, alignItems: "center", borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", minHeight: 54, overflow: "hidden" },
  input: { color: colors.text, flex: 1, fontSize: 14, minHeight: 52, paddingHorizontal: 14 },
  eyeButton: { alignItems: "center", height: 52, justifyContent: "center", width: 48 },
  forgotButton: { alignSelf: "flex-end", marginBottom: 22, marginTop: -4, paddingVertical: 6 },
  forgotText: { color: colors.primaryText, fontSize: 13, fontWeight: "700" },
  submitButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 16, justifyContent: "center", minHeight: 54 },
  submitButtonDisabled: { backgroundColor: colors.backgroundElement },
  submitText: { color: colors.onPrimary, fontSize: 16, fontWeight: "800" },
  submitTextDisabled: { color: colors.text2 },
  errorBox: { alignItems: "flex-start", backgroundColor: colors.errorBg, borderColor: colors.errorBorder, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 7, marginBottom: 12, padding: 12 },
  errorText: { color: colors.error, flex: 1, fontSize: 12, lineHeight: 17 },
  successBox: { backgroundColor: colors.successBg, borderColor: colors.successBorder, borderWidth: 1, borderRadius: 12, marginBottom: 12, padding: 12 },
  successText: { color: colors.text, fontSize: 12, lineHeight: 17 },
});
