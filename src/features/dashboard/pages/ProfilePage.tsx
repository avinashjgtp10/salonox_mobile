// The single Settings page — personal Full Name + all business fields, one
// Save Changes button. Kept as a thin wrapper so /dashboard/profile,
// /dashboard/settings/profile, and /dashboard/settings/business (deep link)
// all land on the exact same page. See BusinessSettingsPage.tsx for the
// actual form.
import BusinessSettingsPage from "../../settings/pages/BusinessSettingsPage";

export default function ProfilePage() {
  return <BusinessSettingsPage />;
}
