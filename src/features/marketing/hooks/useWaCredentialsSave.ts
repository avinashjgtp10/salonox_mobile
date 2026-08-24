import { useState } from "react";
import api from "../../../services/api/axios";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { saveWaConfigThunk, fetchWaConfigThunk } from "../../../middleware/marketing/marketing.thunk";
import type { SaveWaConfigPayload } from "../../../types/marketing.types";

export type WaCredentialsForm = {
  phoneNumberId:      string;
  wabaId:             string;
  appId:              string;
  appSecret:          string;
  accessToken:        string;
  webhookVerifyToken: string;
};

interface VerifyResult {
  check: string;
  valid: boolean;
  info?:  string;
  error?: string;
}

// Maps a verify-all check name → which form field(s) it explains.
const CHECK_TO_FIELD_ERRORS: Record<string, Partial<Record<keyof WaCredentialsForm, string>>> = {
  "App Credentials": {
    appId:     "Invalid App ID — check App Settings → Basic",
    appSecret: "Invalid App Secret — check App Settings → Basic",
  },
  "Access Token": {
    accessToken: "Invalid or expired token — must be a permanent System User token",
  },
  "Phone Number ID": {
    phoneNumberId: "Invalid Phone Number ID or already registered to another account — each salon must have their own WhatsApp number",
  },
  "WhatsApp Business Account": {
    wabaId: "Invalid WABA ID — check WhatsApp → API Setup",
  },
  "Webhook Verify Token": {
    webhookVerifyToken: "This token is already used by another salon — use the suggested one below or create your own unique token",
  },
};

function generateSuggestedToken(): string {
  const rand = Math.random().toString(36).slice(2, 7);
  return `webhook_verify_salon_${rand}`;
}

// Shared behavior behind BOTH places a salon enters WhatsApp credentials —
// the guided first-time setup wizard (MarketingOnboardingPage) and the
// direct edit form (WaConfigPage). They used to duplicate this logic with
// the onboarding wizard's copy validating against Meta BEFORE saving
// (catching bad credentials with a specific per-field reason) while the
// direct edit form just saved blind and left the user to separately click
// "Test Connection" to discover anything was wrong. Same behavior now,
// regardless of which door the salon walks through.
export function useWaCredentialsSave() {
  const dispatch = useAppDispatch();

  const [saving,         setSaving]         = useState(false);
  const [fieldErrors,    setFieldErrors]    = useState<Partial<Record<keyof WaCredentialsForm, string>>>({});
  const [generalError,   setGeneralError]   = useState<string | null>(null);
  const [hasUnchecked,   setHasUnchecked]   = useState(false);
  const [suggestedToken, setSuggestedToken] = useState(() => generateSuggestedToken());

  const clearErrors = () => {
    setFieldErrors({});
    setGeneralError(null);
    setHasUnchecked(false);
  };

  // Verifies every credential against Meta first; only saves if all pass.
  // Returns true on success so callers can advance/close their own UI.
  const verifyAndSave = async (form: WaCredentialsForm): Promise<boolean> => {
    setSaving(true);
    clearErrors();
    try {
      const res = await api.post("/api/v1/wa-config/verify-all", {
        phone_number_id:      form.phoneNumberId,
        waba_id:              form.wabaId,
        app_id:               form.appId,
        app_secret:           form.appSecret,
        access_token:         form.accessToken,
        webhook_verify_token: form.webhookVerifyToken,
      });

      const data: { valid: boolean; results?: VerifyResult[]; error?: string } = res.data?.data ?? res.data;

      if (!data.valid) {
        const results     = data.results ?? [];
        const totalChecks = Object.keys(CHECK_TO_FIELD_ERRORS).length;
        const checkedKeys = new Set(results.map((r) => r.check));
        const newFieldErrors: Partial<Record<keyof WaCredentialsForm, string>> = {};

        for (const result of results) {
          if (!result.valid) {
            const fieldMap = CHECK_TO_FIELD_ERRORS[result.check];
            if (fieldMap) Object.assign(newFieldErrors, fieldMap);
            else setGeneralError(result.error ?? "Verification failed");
          }
        }

        setFieldErrors(newFieldErrors);
        // Backend exited early — not all checks ran, so more errors may
        // still be hiding behind the ones just shown.
        if (checkedKeys.size < totalChecks) setHasUnchecked(true);
        return false;
      }

      // All checks passed — persist it.
      const saveRes = await dispatch(saveWaConfigThunk(form as SaveWaConfigPayload));
      if (saveWaConfigThunk.fulfilled.match(saveRes)) {
        await dispatch(fetchWaConfigThunk());
        return true;
      }
      setGeneralError((saveRes.payload as string) ?? "Failed to save config. Please try again.");
      return false;
    } catch (err: any) {
      setGeneralError(
        err?.response?.data?.error ?? err?.message ?? "Verification failed. Check your internet connection and try again."
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const useSuggestedToken = () => {
    const token = suggestedToken;
    setSuggestedToken(generateSuggestedToken());
    return token;
  };

  return {
    saving,
    fieldErrors,
    generalError,
    hasUnchecked,
    suggestedToken,
    clearErrors,
    verifyAndSave,
    useSuggestedToken,
  };
}
