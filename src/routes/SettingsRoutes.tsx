import { Routes, Route } from "react-router-dom";
import SettingsLayout from "../features/settings/components/SettingsLayout";

// SettingsLayout renders exactly one active section at a time (switched by
// sidebar click, not routed pages) inside a fixed header/sidebar shell. The
// sub-paths just keep deep links (e.g. /dashboard/settings/business) working
// and stay in sync with whichever section is active — SettingsLayout reads
// the path itself to decide which section to show, both on mount and on
// browser back/forward.
export const SettingsRoutes = () => (
  <Routes>
    <Route index element={<SettingsLayout />} />
    <Route path=":section" element={<SettingsLayout />} />
    <Route path="*" element={<SettingsLayout />} />
  </Routes>
);
