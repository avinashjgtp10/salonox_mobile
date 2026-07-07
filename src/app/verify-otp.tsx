import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import {
  PasswordRecoveryScaffold,
  RecoveryMessage,
  RecoveryPrimaryButton,
  RecoveryTextButton,
  RecoveryTextInput,
} from "@/components/auth/passwordRecoveryUi";
import { getApiErrorMessage } from "@/services/api";
import { authService } from "@/services/authService";

const getParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function VerifyOtpScreen() {
  const params = useLocalSearchParams<{
    email?: string;
    message?: string;
  }>();
  const email = getParam(params.email) ?? "";
  const initialMessage = getParam(params.message);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(initialMessage ?? null);
  const [isLoading, setIsLoading] = useState(false);

  const handleOtpChange = (nextOtp: string) => {
    setOtp(nextOtp.replace(/\D/g, ""));
    setOtpError(null);
    setFormError(null);
  };

  const handleVerifyOtp = async () => {
    const trimmedOtp = otp.trim();

    if (!email) {
      setFormError("Email address is missing. Please restart the password reset flow.");
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
      const response = await authService.verifyForgotPasswordOtp({
        email,
        otp: trimmedOtp,
      });
      const resetToken =
        response.data?.resetToken ?? response.data?.token ?? response.data?.verificationToken;

      router.push({
        pathname: "/reset-password",
        params: {
          email,
          message: response.message,
          otp: trimmedOtp,
          resetToken,
        },
      });
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PasswordRecoveryScaffold
      title="Verify OTP"
      subtitle={`Enter the verification code sent to ${email || "your email"}.`}
      footer={
        <RecoveryTextButton
          disabled={isLoading}
          label="Back to Email"
          onPress={() => router.back()}
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
        onSubmitEditing={handleVerifyOtp}
        placeholder="Enter OTP"
        returnKeyType="done"
        textContentType="oneTimeCode"
        value={otp}
      />

      <RecoveryMessage message={formError} type="error" />

      <RecoveryPrimaryButton
        isLoading={isLoading}
        label="Verify OTP"
        onPress={handleVerifyOtp}
      />
    </PasswordRecoveryScaffold>
  );
}
