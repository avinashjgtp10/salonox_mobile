import { Colors } from "@/constants/theme";
import { useAppTheme } from "@/theme/ThemeProvider";

export function useTheme() {
  const { scheme } = useAppTheme();

  return Colors[scheme];
}
