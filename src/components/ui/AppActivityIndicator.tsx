import type { ComponentProps } from "react";
import { ActivityIndicator as PaperActivityIndicator } from "react-native-paper";
import { usePearlColors } from "@/components/auth/pearl/usePearlColors";

/** One Paper spinner for loading states on both iOS and Android. */
export function ActivityIndicator({ color, size = "small", accessibilityLabel = "Loading", ...props }: ComponentProps<typeof PaperActivityIndicator>) {
  const colors = usePearlColors();
  return <PaperActivityIndicator {...props} accessibilityLabel={accessibilityLabel} color={color ?? colors.primaryText} size={size} />;
}
