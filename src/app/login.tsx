import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Keyboard, Linking, Pressable, StyleSheet, View } from "react-native";

import {
  AuthScreen,
  Banner,
  BrandHeader,
  GlassButton,
  GlassCard,
  NotRegisteredModal,
  OutlineButton,
  PrimaryButton,
  SsoIcon,
  TextField,
  authMessages,
  getAuthErrorCode,
  getAuthErrorMessage,
  getNotRegisteredEmail,
  pearl,
  pearlSpace,
  pearlType,
  tooManyAttemptsMessage,
  type SsoProvider,
} from "@/components/auth/pearl";
import { Text, type TextInput } from "@/components/ui/AppTypography";
import { environmentConfig } from "@/config/environment";
import { useAuth } from "@/context/AuthContext";
import { useAppToast } from "@/hooks/useAppToast";
import { ApiError, getApiErrorMessage } from "@/services/api";
import type { AuthUser } from "@/types/auth";
import { takeLoginNotice } from "@/utils/loginNotice";
import { resolveLoginRoute } from "@/utils/routeResolver";
import { isValidEmail } from "@/utils/validation";

const getRouteParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

const isInvalidCredentialsError = (loginError: unknown) => {
  const rawMessage = getApiErrorMessage(loginError);
  return getAuthErrorCode(loginError) === "INVALID_CREDENTIALS" || /INVALID_CREDENTIALS/i.test(rawMessage) || /Invalid credentials/i.test(rawMessage);
};

const isAccountLockedError = (loginError: unknown) => loginError instanceof ApiError && loginError.status === 429;

const isEmailNotVerifiedError = (loginError: unknown) => {
  const rawMessage = getApiErrorMessage(loginError);
  return getAuthErrorCode(loginError) === "EMAIL_NOT_VERIFIED" || /EMAIL_NOT_VERIFIED/i.test(rawMessage) || /email.*not.*verif/i.test(rawMessage);
};

// Backend: a Google/Apple email with no SalonOX account (never auto-created).
const isSsoNotRegisteredError = (ssoError: unknown) => getAuthErrorCode(ssoError) === "NOT_REGISTERED";

// The person closed the account picker: not an error, show nothing.
const isSsoCancelledError = (ssoError: unknown) => getAuthErrorCode(ssoError) === "GOOGLE_SIGN_IN_CANCELLED";

const getWelcomeMessage = (user?: AuthUser | null, via?: string) => {
  const name = user?.firstName?.trim() || user?.fullName?.trim().split(/\s+/)[0];
  return `Welcome back${name ? `, ${name}` : ""}${via ? ` · signed in with ${via}` : ""}`;
};

export default function LoginScreen() {
  const params = useLocalSearchParams<{ successMessage?: string }>();
  const routeSuccessMessage = getRouteParam(params.successMessage);
  const { clearError, error, isLoading, signIn, signInWithGoogle } = useAuth();
  const toast = useAppToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // Why the user was just signed out automatically (e.g. the salon's subscription ended).
  const [notice, setNotice] = useState(takeLoginNotice);
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [ssoLoading, setSsoLoading] = useState<SsoProvider | null>(null);
  const [notRegistered, setNotRegistered] = useState<{ provider: SsoProvider; email: string | null } | null>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const loginInFlight = useRef(false);
  const busy = isLoading || ssoLoading !== null;

  const clearFeedback = () => {
    setFormError(null);
    clearError();
  };

  const focusPasswordField = () => passwordInputRef.current?.focus();
  const handleIdentifierChange = (value: string) => {
    setIdentifier(value);
    setEmailError(null);
    setFailedLoginAttempts(0);
    clearFeedback();
  };

  const handleLogin = async () => {
    if (isLoading || loginInFlight.current) return;
    const trimmedIdentifier = identifier.trim();
    const nextEmailError = !trimmedIdentifier ? authMessages.EMAIL_REQUIRED : !isValidEmail(trimmedIdentifier) ? authMessages.EMAIL_INVALID : null;
    const nextPasswordError = !password ? authMessages.PASSWORD_REQUIRED : null;
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) return;

    Keyboard.dismiss();
    clearFeedback();
    setNotice(null);
    try {
      loginInFlight.current = true;
      const email = trimmedIdentifier.toLowerCase();
      // Spaces are never part of a password (typed or pasted ones are stripped as they're entered).
      const authData = await signIn({ email, password: password.replace(/\s/g, "") });
      setFailedLoginAttempts(0);
      toast.showSuccess(getWelcomeMessage(authData.user));
      router.replace(resolveLoginRoute(authData));
    } catch (loginError) {
      // Prototype wording only: drop the raw server message the auth context keeps.
      clearError();
      if (isEmailNotVerifiedError(loginError)) {
        router.push({
          pathname: "/verify-email",
          params: {
            email: trimmedIdentifier.toLowerCase(),
            message: "Please verify your email to continue signing in.",
          },
        });
      } else if (isAccountLockedError(loginError)) {
        setFormError(tooManyAttemptsMessage(getApiErrorMessage(loginError)));
      } else if (isInvalidCredentialsError(loginError)) {
        const attempts = failedLoginAttempts + 1;
        setFailedLoginAttempts(attempts);
        // The server pauses sign-in after 3 wrong passwords: warn before the last one.
        setFormError(authMessages.INVALID_CREDENTIALS + (attempts === 2 ? authMessages.LAST_ATTEMPT_WARNING : ""));
      } else {
        setFormError(getAuthErrorMessage(loginError, "login"));
      }
    } finally {
      loginInFlight.current = false;
    }
  };

  const handleGoogleLogin = async () => {
    if (busy) return;
    clearFeedback();
    setNotice(null);
    setSsoLoading("Google");
    try {
      const authData = await signInWithGoogle();
      toast.showSuccess(getWelcomeMessage(authData.user, "Google"));
      router.replace(resolveLoginRoute(authData));
    } catch (googleError) {
      clearError();
      if (isSsoCancelledError(googleError)) return;
      if (isSsoNotRegisteredError(googleError)) setNotRegistered({ provider: "Google", email: getNotRegisteredEmail(googleError) });
      else setFormError(getAuthErrorMessage(googleError, "login"));
    } finally {
      setSsoLoading(null);
    }
  };

  // TODO(apple-sign-in): connect to the Apple sign-in flow once it is built.
  const handleAppleLogin = () => {
    if (busy) return;
    clearFeedback();
    toast.showInfo("Sign in with Apple is coming soon. Please sign in with your email for now.");
  };

  const handleSsoRetry = () => {
    const provider = notRegistered?.provider;
    setNotRegistered(null);
    if (provider === "Google") setTimeout(() => void handleGoogleLogin(), 250);
    else if (provider === "Apple") handleAppleLogin();
  };

  // Opens the web registration page in the device browser (not an in-app screen).
  const handleRegister = () => {
    const url = environmentConfig.webRegistrationUrl;
    if (!url) return;
    toast.showSuccess("Opening salonox.com in your browser…");
    void Linking.openURL(url).catch(() => {
      setFormError("Couldn’t open the browser. Please visit salonox.com/register to create your account.");
    });
  };

  const bannerMessage = formError ?? error;

  return (
    <AuthScreen>
      <BrandHeader />

      <GlassCard style={styles.card}>
        <View style={styles.heading}>
          <Text translate style={[pearlType.h1, styles.title]}>Welcome back</Text>
          <Text translate style={[pearlType.body, styles.subtitle]}>Sign in to your beauty and wellness workspace</Text>
        </View>

        {notice ? <Banner kind="warn" title={notice.title} message={notice.message} /> : null}
        {routeSuccessMessage ? <Banner kind="success" message={routeSuccessMessage} /> : null}
        <Banner kind="error" message={bannerMessage} />

        <TextField
          label="Email"
          icon="mail-outline"
          placeholder="you@yoursalon.com"
          value={identifier}
          onChangeText={handleIdentifierChange}
          error={emailError ?? (bannerMessage && isInvalidCredentialsMessage(bannerMessage) ? true : null)}
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={focusPasswordField}
        />
        <TextField
          ref={passwordInputRef}
          label="Password"
          icon="lock-closed-outline"
          placeholder="Enter your password"
          value={password}
          // No spaces anywhere in the password: leading, trailing or internal, typed or pasted.
          onChangeText={(value) => { setPassword(value.replace(/\s/g, "")); setPasswordError(null); clearFeedback(); }}
          error={passwordError ?? (bannerMessage && isInvalidCredentialsMessage(bannerMessage) ? true : null)}
          secureToggle
          autoCapitalize="none"
          autoComplete="password"
          // With the eye toggle on, the field is plain text: without these the keyboard
          // autocorrects the password or appends a space after a suggestion.
          autoCorrect={false}
          spellCheck={false}
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        <Pressable onPress={() => router.push("/forgot-password")} style={styles.forgot} hitSlop={8} accessibilityRole="link">
          <Text translate style={pearlType.link}>Forgot password?</Text>
        </Pressable>

        <PrimaryButton title="Sign in" loading={isLoading && ssoLoading === null} loadingTitle="Signing in…" disabled={busy} onPress={handleLogin} />

        <View style={styles.or}>
          <View style={styles.line} />
          <Text translate style={pearlType.small}>or continue with</Text>
          <View style={styles.line} />
        </View>

        <View style={styles.ssoRow}>
          <GlassButton
            title="Google"
            accessibilityLabel="Login with Google"
            loading={ssoLoading === "Google"}
            disabled={busy}
            onPress={handleGoogleLogin}
            left={<SsoIcon><Text translate style={styles.googleG}>G</Text></SsoIcon>}
            style={styles.flex}
          />
          <GlassButton
            title="Apple"
            accessibilityLabel="Login with Apple"
            disabled={busy}
            onPress={handleAppleLogin}
            left={<SsoIcon dark><Ionicons name="logo-apple" size={13} color={pearl.white} /></SsoIcon>}
            style={styles.flex}
          />
        </View>
      </GlassCard>

      <GlassCard style={styles.register}>
        <View style={styles.flex}>
          <Text translate style={pearlType.bodyStrong}>New to SalonOX?</Text>
          <Text translate style={pearlType.small}>Register your salon or spa on our website</Text>
        </View>
        <OutlineButton
          title="Register"
          onPress={handleRegister}
          right={<Ionicons name="open-outline" size={15} color={pearl.accentDeep} />}
          accessibilityHint="Opens salonox.com in your browser"
        />
      </GlassCard>

      <NotRegisteredModal
        visible={notRegistered !== null}
        provider={notRegistered?.provider ?? "Google"}
        email={notRegistered?.email}
        onRegister={() => { setNotRegistered(null); handleRegister(); }}
        onRetry={handleSsoRetry}
        onUseEmail={() => setNotRegistered(null)}
      />
    </AuthScreen>
  );
}

const isInvalidCredentialsMessage = (message: string) => /incorrect/i.test(message);

const styles = StyleSheet.create({
  card: { gap: 13, paddingVertical: 22, paddingHorizontal: 18 },
  heading: { gap: 4 },
  title: { fontSize: 25 },
  subtitle: { color: pearl.muted, fontSize: 14.5 },
  forgot: { alignSelf: "flex-end", marginTop: -2 },
  or: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 2 },
  line: { flex: 1, height: 1, backgroundColor: pearl.divider },
  ssoRow: { flexDirection: "row", gap: pearlSpace.sm },
  flex: { flex: 1 },
  googleG: { fontSize: 13, fontWeight: "800", color: pearl.ink2 },
  register: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 22, paddingVertical: 14, paddingLeft: 16, paddingRight: 14 },
});
