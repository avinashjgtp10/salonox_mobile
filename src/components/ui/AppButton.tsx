import type { ComponentProps } from "react";
import { Button as PaperButton } from "react-native-paper";
import { useThemeColors } from "@/theme/ThemeProvider";

/** Pale action surfaces need a separate foreground from text-only actions. */
export function Button({ mode = "text", buttonColor, textColor, ...props }: ComponentProps<typeof PaperButton>) {
  const colors = useThemeColors();
  const filled = mode === "contained" || mode === "contained-tonal";
  return <PaperButton {...props} mode={mode}
    buttonColor={buttonColor ?? (filled ? colors.primary : undefined)}
    textColor={textColor ?? (filled ? colors.onPrimary : colors.primaryText)} />;
}
