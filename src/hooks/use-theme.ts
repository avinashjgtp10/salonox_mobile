import { Colors } from "@/constants/theme";
import { useAppTheme } from "@/theme/ThemeProvider";

// Returns the raw light/dark palette (background/accentGold/... key names),
// not the derived `DashboardColors` shape `useThemeColors()` returns — this
// is what the handful of existing consumers (themed-text.tsx, themed-view.tsx,
// explore.tsx, collapsible.tsx) already expect. Still reacts to the app's
// chosen theme mode rather than raw OS scheme.
export function useTheme() {
  const { scheme } = useAppTheme();

  return Colors[scheme];
}
