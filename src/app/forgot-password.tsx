import { router } from "expo-router";
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
import { EMAIL_INVALID_MESSAGE, isValidEmail } from "@/utils/validation";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailChange = (nextEmail: string) => {
    setEmail(nextEmail);
    setEmailError(null);
    setFormError(null);
  };

  const handleSendOtp = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError("Email Address is required.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setEmailError(EMAIL_INVALID_MESSAGE);
      return;
    }

    setIsLoading(true);
    setFormError(null);

    try {
      const response = await authService.sendForgotPasswordOtp({ email: trimmedEmail });

      router.push({
        pathname: "/verify-otp",
        params: {
          email: trimmedEmail,
          message: response.message,
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
      title="Forgot Password"
      subtitle="Enter your email address and we will send a verification code."
      footer={
        <RecoveryTextButton
          disabled={isLoading}
          label="Back to Sign In"
          onPress={() => router.back()}
        />
      }
    >
      <RecoveryTextInput
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        error={emailError ?? undefined}
        iconName="mail-outline"
        keyboardType="email-address"
        label="Email Address"
        onChangeText={handleEmailChange}
        onSubmitEditing={handleSendOtp}
        placeholder="name@company.com"
        returnKeyType="send"
        textContentType="emailAddress"
        value={email}
      />

      <RecoveryMessage message={formError} type="error" />

      <RecoveryPrimaryButton
        isLoading={isLoading}
        label="Send OTP"
        onPress={handleSendOtp}
      />
    </PasswordRecoveryScaffold>
  );
}
