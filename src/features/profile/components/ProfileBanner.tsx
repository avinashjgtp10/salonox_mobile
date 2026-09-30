import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

export function ProfileBanner({ isError, message }: { isError: boolean; message: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View
      style={[styles.banner, isError ? styles.bannerError : styles.bannerSuccess]}
      accessibilityRole="alert"
    >
      <Ionicons
        name={isError ? "alert-circle-outline" : "checkmark-circle-outline"}
        size={18}
        color={isError ? Colors.error : Colors.success}
      />
      <Text style={[styles.text, isError ? styles.textError : styles.textSuccess]}>
        {message}
      </Text>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  banner: {
    alignItems: "center",
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  bannerError: {
    backgroundColor: Colors.errorBg,
    borderColor: Colors.errorBorder,
  },
  bannerSuccess: {
    backgroundColor: Colors.successBg,
    borderColor: Colors.successBorder,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  textError: {
    color: Colors.error,
  },
  textSuccess: {
    color: Colors.success,
  },
});
