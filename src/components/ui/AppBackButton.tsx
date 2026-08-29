import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from "react-native";

import { AppLayout, AppRadius } from "@/constants/layout";
import { type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

type AppBackButtonProps = {
  fallbackHref?: Href;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function AppBackButton({ fallbackHref, onPress, style }: AppBackButtonProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (fallbackHref) {
      router.replace(fallbackHref);
    }
  };

  return (
    <TouchableOpacity
      accessibilityLabel="Go back"
      activeOpacity={0.84}
      hitSlop={AppLayout.headerActionHitSlop}
      onPress={handlePress}
      style={[styles.button, style]}
    >
      <Ionicons color={Colors.primary} name="arrow-back" size={18} />
    </TouchableOpacity>
  );
}

export function AppBackButtonPlaceholder({ style }: { style?: StyleProp<ViewStyle> }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return <TouchableOpacity disabled style={[styles.button, styles.placeholder, style]} />;
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    height: AppLayout.headerActionSize,
    justifyContent: "center",
    width: AppLayout.headerActionSize,
  },
  placeholder: {
    opacity: 0,
  },
});
