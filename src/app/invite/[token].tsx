import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import {
  PasswordRecoveryScaffold,
  RecoveryColors,
  RecoveryMessage,
  RecoveryPrimaryButton,
  RecoveryTextButton,
  RecoveryTextInput,
  passwordRecoveryStyles,
} from "@/components/auth/passwordRecoveryUi";
import { acceptInviteThunk, verifyInviteTokenThunk } from "@/middleware/staff/staffInvitations.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectInviteAcceptError,
  selectInviteAccepting,
  selectInviteVerifyError,
  selectInviteVerifyResult,
  selectInviteVerifying,
} from "@/store/staff/staffInvitations.slice";

const isValidPassword = (value: string) => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value);

export default function StaffInviteAcceptScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = params.token ?? "";
  const dispatch = useAppDispatch();

  const verifying = useAppSelector(selectInviteVerifying);
  const verifyError = useAppSelector(selectInviteVerifyError);
  const verifyResult = useAppSelector(selectInviteVerifyResult);
  const accepting = useAppSelector(selectInviteAccepting);
  const acceptError = useAppSelector(selectInviteAcceptError);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (token) {
      void dispatch(verifyInviteTokenThunk(token));
    }
  }, [dispatch, token]);

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordError(null);
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    setConfirmPasswordError(null);
  };

  const validateForm = () => {
    let isValid = true;

    if (!password) {
      setPasswordError("Password is required.");
      isValid = false;
    } else if (!isValidPassword(password)) {
      setPasswordError("Password must be at least 8 characters and contain letters and numbers.");
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError("Confirm password is required.");
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords must match.");
      isValid = false;
    }

    return isValid;
  };

  const handleAccept = async () => {
    if (!token || !validateForm()) {
      return;
    }

    const resultAction = await dispatch(acceptInviteThunk({ password, token }));

    if (acceptInviteThunk.rejected.match(resultAction)) {
      return;
    }

    router.replace({
      params: {
        successMessage: resultAction.payload.message ?? "Your account is ready. Please sign in.",
      },
      pathname: "/login",
    });
  };

  const passwordToggle = (
    <Pressable
      hitSlop={12}
      onPress={() => setShowPassword((current) => !current)}
      style={passwordRecoveryStyles.passwordToggle}
    >
      <Ionicons
        name={showPassword ? "eye-outline" : "eye-off-outline"}
        size={20}
        color={RecoveryColors.secondary}
      />
    </Pressable>
  );

  if (verifying) {
    return (
      <PasswordRecoveryScaffold
        subtitle="Checking your invitation link..."
        title="Verifying Invite"
      >
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={RecoveryColors.primary} size="large" />
        </View>
      </PasswordRecoveryScaffold>
    );
  }

  if (verifyError || !verifyResult?.valid) {
    return (
      <PasswordRecoveryScaffold
        footer={<RecoveryTextButton label="Back to Login" onPress={() => router.replace("/login")} />}
        subtitle="This invitation link is invalid or has expired."
        title="Invite Link Invalid"
      >
        <RecoveryMessage
          message={verifyError ?? "Please ask your salon admin to resend the invite."}
          type="error"
        />
      </PasswordRecoveryScaffold>
    );
  }

  return (
    <PasswordRecoveryScaffold
      footer={
        <RecoveryTextButton
          disabled={accepting}
          label="Back to Login"
          onPress={() => router.replace("/login")}
        />
      }
      subtitle={
        verifyResult.fullName
          ? `Hi ${verifyResult.fullName}, set a password to activate your account.`
          : "Set a password to activate your account."
      }
      title="Welcome to SalonOX"
    >
      <RecoveryTextInput
        autoCapitalize="none"
        autoComplete="password-new"
        error={passwordError ?? undefined}
        iconName="lock-closed-outline"
        label="Password"
        onChangeText={handlePasswordChange}
        placeholder="Create a password"
        returnKeyType="next"
        rightAccessory={passwordToggle}
        secureTextEntry={!showPassword}
        textContentType="newPassword"
        value={password}
      />

      <RecoveryTextInput
        autoCapitalize="none"
        autoComplete="password-new"
        error={confirmPasswordError ?? undefined}
        iconName="lock-closed-outline"
        label="Confirm Password"
        onChangeText={handleConfirmPasswordChange}
        onSubmitEditing={() => void handleAccept()}
        placeholder="Confirm password"
        returnKeyType="done"
        rightAccessory={passwordToggle}
        secureTextEntry={!showPassword}
        textContentType="newPassword"
        value={confirmPassword}
      />

      <RecoveryMessage message={acceptError} type="error" />

      <RecoveryPrimaryButton
        isLoading={accepting}
        label="Activate Account"
        onPress={() => void handleAccept()}
      />
    </PasswordRecoveryScaffold>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 24,
  },
});
