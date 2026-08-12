import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/theme/ThemeProvider";

type OnboardingFooterProps = {
  showBack?: boolean;
  backLabel?: string;
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  isSubmitting?: boolean;
  disabledContinue?: boolean;
};

export const OnboardingFooter: React.FC<OnboardingFooterProps> = ({
  showBack = true,
  backLabel = "Back",
  onBack,
  onContinue,
  continueLabel = "Continue",
  isSubmitting = false,
  disabledContinue = false,
}) => {
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === "dark";

  return (
    <View style={styles.container}>
      {showBack && onBack ? (
        <Pressable
          accessibilityLabel={backLabel}
          accessibilityRole="button"
          onPress={onBack}
          disabled={isSubmitting}
          style={({ pressed }) => [
            styles.button,
            styles.backButton,
            {
              backgroundColor: isDark ? colors.card : "#FFFFFF",
              borderColor: colors.border,
            },
            pressed && styles.buttonPressed,
            isSubmitting && styles.buttonDisabled,
          ]}
        >
          <Ionicons
            name="chevron-back-outline"
            size={18}
            color={colors.secondary}
            style={styles.iconBack}
          />
          <Text style={[styles.buttonText, { color: colors.secondary }]}>
            {backLabel}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.buttonPlaceholder} />
      )}

      <Pressable
        accessibilityLabel={continueLabel}
        accessibilityRole="button"
        onPress={onContinue}
        disabled={isSubmitting || disabledContinue}
        style={({ pressed }) => [
          styles.button,
          styles.continueButton,
          { backgroundColor: colors.primary },
          pressed && styles.buttonPressed,
          (isSubmitting || disabledContinue) && styles.buttonDisabled,
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Text style={[styles.buttonText, { color: colors.onPrimary ?? "#FFFFFF" }]}>
              {continueLabel}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={colors.onPrimary ?? "#FFFFFF"}
              style={styles.iconContinue}
            />
          </>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    width: "100%",
  },
  button: {
    alignItems: "center",
    borderRadius: 16,
    flex: 1,
    flexDirection: "row",
    height: 52,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  buttonPlaceholder: {
    flex: 1,
    height: 52,
  },
  backButton: {
    borderWidth: 1.5,
  },
  continueButton: {
    borderWidth: 0,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  iconBack: {
    marginRight: 6,
  },
  iconContinue: {
    marginLeft: 6,
  },
});
