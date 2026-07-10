import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { PageLoader } from "../components/ui/PageLoader";
import SettingsLayout from "../features/settings/components/SettingsLayout";

const ProfileSettingsPage   = lazy(() => import("../features/settings/pages/ProfileSettingsPage"));
const BusinessSettingsPage  = lazy(() => import("../features/settings/pages/BusinessSettingsPage"));
const AccountSettingsPage   = lazy(() => import("../features/settings/pages/AccountSettingsPage"));
const NotificationsPage     = lazy(() => import("../features/settings/pages/NotificationsPage"));
const RolesPermissionsPage  = lazy(() => import("../features/settings/pages/RolesPermissionsPage"));
const IntegrationsPage      = lazy(() => import("../features/settings/pages/IntegrationsPage"));
const BillingPage           = lazy(() => import("../features/settings/pages/BillingPage"));
const DataPrivacyPage       = lazy(() => import("../features/settings/pages/DataPrivacyPage"));
const SettingsManagementPage = lazy(() => import("../features/settings/pages/SettingsManagementPage"));
const RewardsSettingsPage    = lazy(() => import("../features/settings/pages/RewardsSettingsPage"));
const ReferralSettingsPage   = lazy(() => import("../features/settings/pages/ReferralSettingsPage"));
const CouponsSettingsPage    = lazy(() => import("../features/settings/pages/CouponsSettingsPage"));
const HalfDayRulePage        = lazy(() => import("../features/settings/pages/HalfDayRulePage"));

export const SettingsRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route element={<SettingsLayout />}>
        {/* Default redirect to profile */}
        <Route index element={<Navigate to="profile" replace />} />
        <Route path="profile"       element={<ProfileSettingsPage />} />
        <Route path="business"      element={<BusinessSettingsPage />} />
        <Route path="account"       element={<AccountSettingsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="roles"         element={<RolesPermissionsPage />} />
        <Route path="integrations"  element={<IntegrationsPage />} />
        <Route path="billing"       element={<BillingPage />} />
        <Route path="data-privacy"  element={<DataPrivacyPage />} />
        <Route path="tax-mapping"    element={<SettingsManagementPage />} />
        <Route path="reward-points" element={<RewardsSettingsPage />} />
        <Route path="referral"      element={<ReferralSettingsPage />} />
        <Route path="coupons"       element={<CouponsSettingsPage />} />
        <Route path="half-day-rule" element={<HalfDayRulePage />} />
        {/* Catch-all → profile */}
        <Route path="*"             element={<Navigate to="profile" replace />} />
      </Route>
    </Routes>
  </Suspense>
);
