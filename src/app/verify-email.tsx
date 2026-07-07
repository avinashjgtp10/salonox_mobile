import { router, useLocalSearchParams, type Href } from "expo-router";
import { useState } from "react";

import {
  PasswordRecoveryScaffold,
  RecoveryMessage,
  RecoveryPrimaryButton,
  RecoveryTextButton,
  RecoveryTextInput,
} from "@/components/auth/passwordRecoveryUi";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/services/api";
import { authService } from "@/services/authService";

const getParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string; message?: string }>();
  const { refreshCurrentUser, user } = useAuth();
  const email = getParam(params.email) ?? user?.email ?? "";
  const initialMessage = getParam(params.message);

  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(initialMessage ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const navigateOnward = () => {
    // The root auth guard resolves the correct destination (onboarding vs. dashboard)
    // based on the freshest user state, so we just leave the public verify route.
    router.replace("/dashboard" as Href);
  };

  const handleOtpChange = (nextOtp: string) => {
    setOtp(nextOtp.replace(/\D/g, ""));
    setOtpError(null);
    setFormError(null);
  };

  const handleVerify = async () => {
    const trimmedOtp = otp.trim();

    if (!email) {
      setFormError("Email address is missing. Please restart the verification flow.");
      return;
    }

    if (!trimmedOtp) {
      setOtpError("OTP is required.");
      return;
    }

    if (trimmedOtp.length < 4) {
      setOtpError("Please enter a valid OTP.");
      return;
    }

    setIsLoading(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      await authService.verifyEmailOtp({ email, otp: trimmedOtp });

      try {
        await refreshCurrentUser();
      } catch {
        // Non-fatal: verification succeeded even if the profile refetch hiccups.
      }

      navigateOnward();
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setFormError("Email address is missing. Please restart the verification flow.");
      return;
    }

    setIsResending(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const response = await authService.sendEmailOtp({ email });
      setSuccessMessage(response.message);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setIsResending(false);
    }
  };

  const isBusy = isLoading || isResending;

  return (
    <PasswordRecoveryScaffold
      title="Verify Email"
      subtitle={`Enter the verification code sent to ${email || "your email"}.`}
      footer={
        <RecoveryTextButton
          disabled={isBusy}
          label="I'll verify later"
          onPress={navigateOnward}
        />
      }
    >
      <RecoveryMessage message={successMessage} type="success" />

      <RecoveryTextInput
        autoComplete="one-time-code"
        error={otpError ?? undefined}
        iconName="keypad-outline"
        keyboardType="number-pad"
        label="Verification Code"
        maxLength={8}
        onChangeText={handleOtpChange}
        onSubmitEditing={handleVerify}
        placeholder="Enter OTP"
        returnKeyType="done"
        textContentType="oneTimeCode"
        value={otp}
      />

      <RecoveryMessage message={formError} type="error" />

      <RecoveryPrimaryButton isLoading={isLoading} label="Verify Email" onPress={handleVerify} />

      <RecoveryTextButton
        disabled={isBusy}
        label={isResending ? "Resending..." : "Resend OTP"}
        onPress={handleResend}
      />
    </PasswordRecoveryScaffold>
  );
}
