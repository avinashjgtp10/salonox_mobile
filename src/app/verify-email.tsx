import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";

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

const OTP_RESEND_COOLDOWN_SECONDS = 60;

const formatCountdown = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const getEmailOtpError = (error: unknown) => {
  const message = getApiErrorMessage(error);
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("expired")) {
    return {
      field: true,
      message: "This OTP has expired. Please request a new code.",
    };
  }

  if (
    normalizedMessage.includes("invalid") ||
    normalizedMessage.includes("incorrect") ||
    normalizedMessage.includes("wrong") ||
    normalizedMessage.includes("does not match")
  ) {
    return {
      field: true,
      message: "Invalid OTP. Please check the code and try again.",
    };
  }

  return {
    field: false,
    message,
  };
};

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
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(
    OTP_RESEND_COOLDOWN_SECONDS
  );

  useEffect(() => {
    if (resendCooldownSeconds <= 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setResendCooldownSeconds((currentSeconds) => Math.max(currentSeconds - 1, 0));
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [resendCooldownSeconds]);

  const resendCountdown = useMemo(
    () => formatCountdown(resendCooldownSeconds),
    [resendCooldownSeconds]
  );

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
      const otpErrorResponse = getEmailOtpError(error);

      if (otpErrorResponse.field) {
        setOtpError(otpErrorResponse.message);
      } else {
        setFormError(otpErrorResponse.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (isResending || resendCooldownSeconds > 0) {
      return;
    }

    if (!email) {
      setFormError("Email address is missing. Please restart the verification flow.");
      return;
    }

    setIsResending(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const response = await authService.sendEmailOtp({ email });
      setOtp("");
      setOtpError(null);
      setFormError(null);
      setSuccessMessage(response.message);
      setResendCooldownSeconds(OTP_RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setIsResending(false);
    }
  };

  const isBusy = isLoading || isResending;
  const isResendCooldownActive = resendCooldownSeconds > 0;
  const resendButtonLabel = isResending
    ? "Resending..."
    : isResendCooldownActive
      ? `Resend OTP in ${resendCountdown}`
      : "Resend OTP";

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
        disabled={isBusy || isResendCooldownActive}
        label={resendButtonLabel}
        onPress={handleResend}
      />
    </PasswordRecoveryScaffold>
  );
}
