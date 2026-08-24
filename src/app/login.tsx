import { Ionicons } from "@expo/vector-icons";
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

import { KeyboardAwareScrollView, type KeyboardAwareScrollViewHandle } from "@/components/ui/KeyboardAwareScrollView";
import { useAuth } from "@/context/AuthContext";
import { ApiError, getApiErrorMessage } from "@/services/api";
import { EMAIL_INVALID_MESSAGE, isValidEmail } from "@/utils/validation";
import { resolveLoginRoute } from "@/utils/routeResolver";

type LoginMode = "email" | "mobile";

const getRouteParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

const isInvalidCredentialsError = (loginError: unknown) => {
  const rawMessage = getApiErrorMessage(loginError);
  return /INVALID_CREDENTIALS/i.test(rawMessage) || /Invalid credentials/i.test(rawMessage);
};

const isAccountLockedError = (loginError: unknown) => loginError instanceof ApiError && loginError.status === 429;

const getFriendlyLoginErrorMessage = (loginError: unknown) => {
  const rawMessage = getApiErrorMessage(loginError);
  const cleanedMessage = rawMessage.split("\n").map((line) => line.trim()).filter((line) => line && !/^[A-Z0-9_]+$/.test(line)).join("\n");
  return cleanedMessage || "We could not sign you in. Please try again.";
};

export default function LoginScreen() {
  const params = useLocalSearchParams<{ successMessage?: string }>();
  const routeSuccessMessage = getRouteParam(params.successMessage);
  const { clearError, error, isLoading, signIn } = useAuth();
  const [mode, setMode] = useState<LoginMode>("mobile");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [activeKeyboardFieldRef, setActiveKeyboardFieldRef] = useState<RefObject<TextInput | null> | null>(null);
  const scrollViewRef = useRef<KeyboardAwareScrollViewHandle | null>(null);
  const identifierInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const [cardOpacity] = useState(() => new Animated.Value(0));
  const [cardTranslate] = useState(() => new Animated.Value(16));
  const keyboardNavigationFields = useMemo(() => [{ ref: identifierInputRef }, { ref: passwordInputRef }], []);
  const normalizedMobile = identifier.replace(/\D/g, "").slice(-10);
  const canSubmit = Boolean(identifier.trim() && password);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, { duration: 300, toValue: 1, useNativeDriver: true }),
      Animated.spring(cardTranslate, { damping: 18, stiffness: 170, toValue: 0, useNativeDriver: true }),
    ]).start();
  }, [cardOpacity, cardTranslate]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setIsKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setIsKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const clearFeedback = () => {
    setFormError(null);
    clearError();
  };

  const changeMode = (nextMode: LoginMode) => {
    setMode(nextMode);
    setIdentifier("");
    setFailedLoginAttempts(0);
    clearFeedback();
    requestAnimationFrame(() => identifierInputRef.current?.focus());
  };

  const handleIdentifierChange = (value: string) => {
    setIdentifier(mode === "mobile" ? value.replace(/\D/g, "").slice(0, 10) : value);
    setFailedLoginAttempts(0);
    clearFeedback();
  };

  const handleLogin = async () => {
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier || !password) {
      setFormError(`Please enter your ${mode === "email" ? "email address" : "mobile number"} and password.`);
      return;
    }
    if (mode === "email" && !isValidEmail(trimmedIdentifier)) {
      setFormError(EMAIL_INVALID_MESSAGE);
      return;
    }
    if (mode === "mobile" && normalizedMobile.length !== 10) {
      setFormError("Please enter a valid 10-digit mobile number.");
      return;
    }

    clearFeedback();
    try {
      const loginIdentifier = mode === "mobile" ? `+91${normalizedMobile}` : trimmedIdentifier.toLowerCase();
      const authData = await signIn({ email: loginIdentifier, password });
      setFailedLoginAttempts(0);
      router.replace(resolveLoginRoute(authData));
    } catch (loginError) {
      if (isAccountLockedError(loginError)) {
        setFormError(getApiErrorMessage(loginError));
      } else if (isInvalidCredentialsError(loginError)) {
        const attempts = failedLoginAttempts + 1;
        setFailedLoginAttempts(attempts);
        setFormError(`${mode === "email" ? "Email" : "Mobile number"} or password is incorrect.${attempts >= 3 ? " Use Forgot Password below to reset it." : ""}`);
      } else {
        setFormError(getFriendlyLoginErrorMessage(loginError));
      }
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor="#131210" barStyle="light-content" />
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
        <KeyboardAwareScrollView
          ref={scrollViewRef as any}
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          keyboardNavigation={{ activeFieldRef: activeKeyboardFieldRef, fields: keyboardNavigationFields, hideOnLast: true, keyboardVisible: isKeyboardVisible, onDone: handleLogin, showAccessory: false }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardTranslate }] }]}>
            <Text style={styles.title}>Sign-In</Text>

            <View style={styles.tabs}>
              {(["email", "mobile"] as LoginMode[]).map((tab) => (
                <Pressable key={tab} onPress={() => changeMode(tab)} style={[styles.tab, mode === tab && styles.activeTab]}>
                  <Text style={[styles.tabText, mode === tab && styles.activeTabText]}>{tab === "email" ? "Email" : "Mobile"}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{mode === "email" ? "Email" : "Mobile"}</Text>
              <View style={styles.inputShell}>
                {mode === "mobile" ? <View style={styles.countryCode}><Text style={styles.countryCodeText}>+91</Text><Ionicons color="#111111" name="chevron-down" size={18} /></View> : null}
                <TextInput
                  autoCapitalize="none"
                  autoComplete={mode === "email" ? "email" : "tel"}
                  autoCorrect={false}
                  keyboardType={mode === "email" ? "email-address" : "phone-pad"}
                  onChangeText={handleIdentifierChange}
                  onFocus={() => setActiveKeyboardFieldRef(identifierInputRef)}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  placeholder={mode === "email" ? "Enter the registered email address" : "Enter the registered mobile number"}
                  placeholderTextColor="#A2A2A2"
                  ref={identifierInputRef}
                  returnKeyType="next"
                  style={styles.input}
                  textContentType={mode === "email" ? "emailAddress" : "telephoneNumber"}
                  value={identifier}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputShell}>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="password"
                  onChangeText={(value) => { setPassword(value); clearFeedback(); }}
                  onFocus={() => setActiveKeyboardFieldRef(passwordInputRef)}
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
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#F8F2F6", flex: 1 },
  hero: { backgroundColor: "#131210", height: 300, overflow: "hidden" },
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
  contentSafeArea: { flex: 1, marginTop: -146 },
  scrollContent: { flexGrow: 1, paddingBottom: 24, paddingHorizontal: 15 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 12, minHeight: 570, paddingBottom: 30, paddingHorizontal: 18, paddingTop: 18 },
  title: { color: "#111111", fontFamily: "serif", fontSize: 32, fontWeight: "800", marginBottom: 18, marginTop: 12, textAlign: "center" },
  tabs: { borderBottomColor: "#D0D0D0", borderBottomWidth: 1, flexDirection: "row", marginBottom: 20 },
  tab: { alignItems: "center", flex: 1, justifyContent: "center", minHeight: 44 },
  activeTab: { borderBottomColor: "#0B4F9C", borderBottomWidth: 2 },
  tabText: { color: "#252525", fontSize: 15 },
  activeTabText: { color: "#0B4F9C", fontWeight: "800" },
  fieldGroup: { marginBottom: 17 },
  label: { color: "#707070", fontSize: 13, marginBottom: 7 },
  inputShell: { alignItems: "center", borderColor: "#D3D3D3", borderRadius: 7, borderWidth: 1, flexDirection: "row", minHeight: 54, overflow: "hidden" },
  countryCode: { alignItems: "center", flexDirection: "row", gap: 7, paddingLeft: 12, paddingRight: 9 },
  countryCodeText: { color: "#111111", fontSize: 15, fontWeight: "700" },
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
