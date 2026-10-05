import { Text, TextInput } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

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
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ successMessage?: string }>();
  const routeSuccessMessage = getRouteParam(params.successMessage);
  const { clearError, error, isLoading, signIn } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const emailFieldRef = useRef<View>(null);
  const passwordFieldRef = useRef<View>(null);
  const focusedField = useRef<"email" | "password" | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboardOpen = useRef(false);
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

  // Scrolls the focused field's label to just below the status bar. The
  // position is measured relative to the scroll content (not the window), so
  // it stays correct while the keyboard is still resizing the viewport.
  const revealFocusedField = useCallback(() => {
    const field = focusedField.current;
    const fieldView = field === "email" ? emailFieldRef.current : field === "password" ? passwordFieldRef.current : null;
    const content = scrollContentRef.current;
    if (!keyboardOpen.current || !fieldView || !content) return;
    fieldView.measureLayout(content, (_x, fieldY) => {
      if (!keyboardOpen.current || focusedField.current !== field) return;
      scrollViewRef.current?.scrollTo({ y: Math.max(0, fieldY - insets.top - 16), animated: true });
    }, () => undefined);
  }, [insets.top]);

  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", (event) => {
      keyboardOpen.current = true;
      // Android: reserve the keyboard's height below the form ourselves so the
      // ScrollView always has room to scroll, whether or not the window resized.
      if (Platform.OS === "android") setKeyboardHeight(event.endCoordinates.height);
      revealFocusedField();
      // Retry once the keyboard/layout has settled — a scroll issued while the
      // content still fits the old viewport is clamped to 0 and lost.
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(revealFocusedField, 250);
    });
    const hidden = Keyboard.addListener("keyboardDidHide", () => {
      keyboardOpen.current = false;
      if (settleTimer.current) clearTimeout(settleTimer.current);
      setKeyboardHeight(0);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    });
    return () => {
      shown.remove();
      hidden.remove();
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, [revealFocusedField]);
  const clearFeedback = () => {
    setFormError(null);
    clearError();
  };

  const scrollToField = (field: "email" | "password") => {
    focusedField.current = field;
    revealFocusedField();
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
      const authData = await signIn({ email: trimmedIdentifier.toLowerCase(), password });
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
      <StatusBar backgroundColor="#131210" barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.formKeyboardArea}
        behavior="padding"
        enabled={Platform.OS === "ios"}
      >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.pageContent, { paddingBottom: keyboardHeight }]}
        onContentSizeChange={revealFocusedField}
        onLayout={revealFocusedField}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <View ref={scrollContentRef} collapsable={false} style={styles.pageContent}>
      <View style={styles.hero}>
        <Image resizeMode="cover" source={require("../../assets/images/auth/floral-line-art.png")} style={styles.heroPattern} />
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
            <Text style={styles.title}>Sign-In</Text>

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
                  onFocus={() => scrollToField("email")}
                  onSubmitEditing={focusPasswordField}
                  placeholder="Enter the registered email address"
                  placeholderTextColor="#A2A2A2"
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
                  autoCapitalize="none"
                  autoComplete="password"
                  onChangeText={(value) => { setPassword(value); clearFeedback(); }}
                  onFocus={() => scrollToField("password")}
                  onSubmitEditing={handleLogin}
                  placeholder="Enter Password"
                  placeholderTextColor="#858585"
                  ref={passwordInputRef}
                  returnKeyType="done"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  textContentType="password"
                  value={password}
                />
                <Pressable accessibilityLabel={showPassword ? "Hide password" : "Show password"} hitSlop={12} onPress={() => setShowPassword((visible) => !visible)} style={styles.eyeButton}>
                  <Ionicons color="#111111" name={showPassword ? "eye-outline" : "eye-off-outline"} size={22} />
                </Pressable>
              </View>
            </View>

            {routeSuccessMessage ? <View style={styles.successBox}><Text style={styles.successText}>{routeSuccessMessage}</Text></View> : null}
            {formError || error ? <View accessibilityRole="alert" style={styles.errorBox}><Ionicons color="#C73D4A" name="alert-circle-outline" size={17} /><Text style={styles.errorText}>{formError ?? error}</Text></View> : null}

            <Pressable onPress={() => router.push("/forgot-password")} style={styles.forgotButton}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>

            <Pressable disabled={!canSubmit || isLoading} onPress={handleLogin} style={[styles.submitButton, (!canSubmit || isLoading) && styles.submitButtonDisabled]}>
              {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Sign In</Text>}
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
      </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#F8F2F6", flex: 1 },
  hero: { backgroundColor: "#131210", height: 300, flexShrink: 0, overflow: "hidden" },
  heroPattern: { height: "130%", opacity: 0.1, position: "absolute", tintColor: "#FFFFFF", width: "115%" },
  heroSafeArea: { flex: 1 },
  headerRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 13 },
  wordmark: { alignItems: "center", flex: 1, flexDirection: "row", minWidth: 0 },
  logo: { height: 54, width: 54 },
  wordmarkCopy: { marginLeft: 9, minWidth: 0 },
  wordmarkName: { alignItems: "baseline", flexDirection: "row" },
  wordmarkText: { color: "#FFFFFF", fontSize: 24, fontWeight: "800" },
  wordmarkAccent: { color: "#00D7A1", fontSize: 24, fontWeight: "800" },
  wordmarkTagline: { color: "#BFBFBF", fontSize: 8, marginTop: 1 },
  contentSafeArea: { flexGrow: 1, marginTop: -146 },
  formKeyboardArea: { flex: 1 },
  pageContent: { flexGrow: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 24, paddingHorizontal: 15 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 12, minHeight: 570, paddingBottom: 30, paddingHorizontal: 18, paddingTop: 18 },
  title: { color: "#111111", fontFamily: "serif", fontSize: 32, fontWeight: "800", marginBottom: 18, marginTop: 12, textAlign: "center" },
  fieldGroup: { marginBottom: 17 },
  label: { color: "#707070", fontSize: 13, marginBottom: 7 },
  inputShell: { alignItems: "center", borderColor: "#D3D3D3", borderRadius: 7, borderWidth: 1, flexDirection: "row", minHeight: 54, overflow: "hidden" },
  input: { color: "#161616", flex: 1, fontSize: 14, minHeight: 52, paddingHorizontal: 12 },
  eyeButton: { alignItems: "center", height: 52, justifyContent: "center", width: 48 },
  forgotButton: { alignSelf: "flex-end", marginBottom: 28, marginTop: -4, paddingVertical: 6 },
  forgotText: { color: "#0B4F9C", fontSize: 14, fontWeight: "700", textDecorationLine: "underline" },
  submitButton: { alignItems: "center", backgroundColor: "#0B4F9C", borderRadius: 28, justifyContent: "center", minHeight: 52, marginHorizontal: 18 },
  submitButtonDisabled: { backgroundColor: "#D5D5D5" },
  submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  errorBox: { alignItems: "flex-start", backgroundColor: "#FFF0F1", borderColor: "#F2C5C9", borderRadius: 6, borderWidth: 1, flexDirection: "row", gap: 7, marginBottom: 12, padding: 10 },
  errorText: { color: "#A92F3A", flex: 1, fontSize: 12, lineHeight: 17 },
  successBox: { backgroundColor: "#EAF8F3", borderRadius: 6, marginBottom: 12, padding: 10 },
  successText: { color: "#087A5B", fontSize: 12, lineHeight: 17 },
});
