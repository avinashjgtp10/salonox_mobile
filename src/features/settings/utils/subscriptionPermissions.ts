import type { Setting } from "../../../types/setting.types";

// Same salon_settings fixed-key convention as taxModuleSettings.ts — one JSON
// blob per salon, managed exclusively by the super admin (see
// SubscriptionPermissionsPage.tsx / subscriptionPermission.middleware.ts on
// the backend, which is the actual enforcement point). This frontend copy is
// UI-only: it hides/disables actions the account can't use, so users aren't
// shown buttons that will 403 — it is NOT a security boundary by itself.
export const SUBSCRIPTION_PERMISSIONS_SETTING_KEY = "subscription_permissions";

export interface SubscriptionPermissions {
  view_subscription: boolean;
  renew_subscription: boolean;
  upgrade_subscription: boolean;
  downgrade_subscription: boolean;
  cancel_subscription: boolean;
  view_billing_history: boolean;
  manage_payment_methods: boolean;
}

// Nothing configured yet = everything allowed, matching the backend
// middleware's default so this never blocks a salon nobody has touched.
export const DEFAULT_SUBSCRIPTION_PERMISSIONS: SubscriptionPermissions = {
  view_subscription: true,
  renew_subscription: true,
  upgrade_subscription: true,
  downgrade_subscription: true,
  cancel_subscription: true,
  view_billing_history: true,
  manage_payment_methods: true,
};

function parseValue(raw: Setting["value"]): Partial<SubscriptionPermissions> {
  if (raw && typeof raw === "object") return raw as Partial<SubscriptionPermissions>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* fall through to default */
    }
  }
  return {};
}

export function getSubscriptionPermissions(settingItems: Setting[] | undefined | null): SubscriptionPermissions {
  const row = (settingItems ?? []).find(s => s.key === SUBSCRIPTION_PERMISSIONS_SETTING_KEY);
  return { ...DEFAULT_SUBSCRIPTION_PERMISSIONS, ...parseValue(row?.value) };
}
