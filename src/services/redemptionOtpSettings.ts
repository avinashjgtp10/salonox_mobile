import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";

// Per-salon switch for "the client must confirm a WhatsApp OTP before a package
// session / membership benefit is redeemed" — one for packages, one for
// memberships, independent of each other. Same salon_settings convention as the
// backend's redemption-otp.settings.ts: one reserved key, JSON value, default
// OFF for both. The key MUST match the backend's REDEEM_OTP_SETTING_KEY and the
// web's so the three stay in sync.
const KEY = "redeem_otp_required";

export type RedeemKind = "package" | "membership";
export type RedemptionOtpConfig = Record<RedeemKind, boolean>;

const DEFAULTS: RedemptionOtpConfig = { package: false, membership: false };

type SettingRow = { id: string; key: string; value: unknown };

// Matches the backend's tolerance for the legacy single switch ({ enabled: true }),
// which turned both on before packages and memberships became separate toggles.
const parse = (value: unknown): RedemptionOtpConfig => {
  let parsed: unknown = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch { return DEFAULTS; }
  }
  const record = (parsed ?? {}) as Partial<RedemptionOtpConfig> & { enabled?: boolean };
  if (record.package === undefined && record.membership === undefined) {
    return record.enabled === true ? { package: true, membership: true } : DEFAULTS;
  }
  return { package: record.package === true, membership: record.membership === true };
};

async function readRow() {
  const response = await api.get<{ data: SettingRow[] }>("/settings");
  return (response.data.data ?? []).find((item) => item.key === KEY);
}

// Last known value, so a checkout right after the toggle changes is already in step.
let cached: RedemptionOtpConfig = DEFAULTS;
const listeners = new Set<(value: RedemptionOtpConfig) => void>();
const publish = (value: RedemptionOtpConfig) => {
  cached = value;
  listeners.forEach((listener) => listener(value));
};

export const redemptionOtpSettingsService = {
  getCached(): RedemptionOtpConfig {
    return cached;
  },

  async get(): Promise<RedemptionOtpConfig> {
    const row = await readRow();
    const value = row ? parse(row.value) : DEFAULTS;
    publish(value);
    return value;
  },

  async save(next: RedemptionOtpConfig) {
    const row = await readRow();
    const value = JSON.stringify(next);
    if (row) await api.put(`/settings/${encodeURIComponent(row.id)}`, { key: KEY, value });
    else await api.post("/settings", { key: KEY, value, description: "Require a WhatsApp OTP before redeeming a package or membership" });
    publish(next);
  },
};

/** The salon's package / membership OTP requirement, refreshed from the server on mount. */
export function useRedemptionOtpConfig() {
  const [config, setConfig] = useState(cached);

  useEffect(() => {
    listeners.add(setConfig);
    // Unreadable setting = not required, i.e. today's behavior.
    redemptionOtpSettingsService.get().catch(() => undefined);
    return () => { listeners.delete(setConfig); };
  }, []);

  const toggle = useCallback(async (field: keyof RedemptionOtpConfig) => {
    const previous = cached;
    const next = { ...previous, [field]: !previous[field] };
    publish(next);
    try {
      await redemptionOtpSettingsService.save(next);
    } catch (error) {
      publish(previous);
      throw error;
    }
  }, []);

  return { config, toggle };
}
