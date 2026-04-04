import { Routes, Route } from "react-router-dom"

// NOTE: All Settings page components live in the features/settings-ui branch.
// They will be imported and wired up here once that branch is merged into main.
// The stub below keeps the build clean in the meantime.

const SettingsComingSoon = () => (
  <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>
    Settings pages are in the <strong>features/settings-ui</strong> branch.
    Merge that branch to restore all settings routes.
  </div>
)

export const SettingsRoutes = () => (
  <Routes>
    <Route path="*" element={<SettingsComingSoon />} />
  </Routes>
)
