import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, type PropsWithChildren, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import type { ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/theme/ThemeProvider";

export const RecoveryColors = {
  bgGradientStart: "#FBFAF7",
  bgGradientEnd: "#F2EFE9",
  primary: "#1C1917",
  primaryDark: "#1C1917",
  secondary: "#726A63",
  accent: "#AFA79D",
  accentDark: "#726A63",
  shadow: "#141210",
  text: "#1C1917",
  textPrimary: "#4D463F",
  textSecondary: "#726A63",
  placeholder: "#AFA79D",
  cardBg: "#FFFFFF",
  cardBorder: "#E7E2D9",
  inputBg: "#FFFFFF",
  inputBorder: "#E7E2D9",
  error: "#726A63",
  errorBg: "rgba(114, 106, 99, 0.12)",
  success: "#1C1917",
  successBg: "rgba(28, 25, 23, 0.08)",
};

const createRecoveryColors = (theme: ThemeColors, scheme: "light" | "dark") => ({
  ...RecoveryColors,
  bgGradientStart: theme.bg,
  bgGradientEnd: theme.bg2,
  primary: theme.primary,
  primaryDark: theme.primaryDark,
  secondary: theme.secondary,
  accent: theme.gold,
  accentDark: theme.goldDark,
  shadow: theme.shadow,
  text: theme.heading,
  textPrimary: theme.text,
  textSecondary: theme.text2,
  placeholder: theme.placeholder,
  cardBg: theme.card,
  cardBorder: theme.border,
  inputBg: scheme === "dark" ? theme.bg2 : theme.card,
  inputBorder: theme.border,
  error: theme.error,
  errorBg: theme.errorBg,
  errorBorder: theme.errorBorder,
  success: theme.success,
  successBg: theme.successBg,
  successBorder: theme.successBorder,
  statusBarStyle: scheme === "dark" ? ("light-content" as const) : ("dark-content" as const),
});

type RecoveryThemeColors = ReturnType<typeof createRecoveryColors>;

const useRecoveryTheme = () => {
  const { colors, scheme } = useAppTheme();
  const themedColors = useMemo(() => createRecoveryColors(colors, scheme), [colors, scheme]);
  const themedStyles = useMemo(() => createStyles(themedColors), [themedColors]);

  return { colors: themedColors, styles: themedStyles };
};

type PasswordRecoveryScaffoldProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  footer?: ReactNode;
}>;

type RecoveryTextInputProps = TextInputProps & {
  iconName: keyof typeof Ionicons.glyphMap;
  error?: string;
  label: string;
  rightAccessory?: React.ReactNode;
};

type RecoveryButtonProps = {
  disabled?: boolean;
  isLoading?: boolean;
  label: string;
  onPress: () => void;
};

type RecoveryMessageProps = {
  message?: string | null;
  type: "error" | "success";
};

export function PasswordRecoveryScaffold({
  children,
  footer,
  subtitle,
  title,
}: PasswordRecoveryScaffoldProps) {
  const { colors, styles } = useRecoveryTheme();

  return (
    <LinearGradient
      colors={[colors.bgGradientStart, colors.bgGradientEnd]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bgGradientStart} />

      <View pointerEvents="none" style={styles.blurContainer}>
        <LinearGradient
          colors={["rgba(28, 25, 23, 0.08)", "transparent"]}
          style={[styles.glowBlob, styles.glowSage]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={["rgba(175, 167, 157, 0.14)", "transparent"]}
          style={[styles.glowBlob, styles.glowGold]}
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          contentContainerStyle={styles.scrollContainer}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.brandContainer}>
              <Image
                source={require("../../../assets/images/logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            {children}

            {footer}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

export function RecoveryTextInput({
  error,
  iconName,
  label,
  rightAccessory,
  style,
  ...inputProps
}: RecoveryTextInputProps) {
  const { colors, styles } = useRecoveryTheme();

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputContainer, error && styles.inputContainerError]}>
        <Ionicons
          name={iconName}
          size={20}
          color={colors.secondary}
          style={styles.inputIcon}
        />
        <TextInput
          placeholderTextColor={colors.placeholder}
          style={[styles.textInput, style]}
          {...inputProps}
        />
        {rightAccessory}
      </View>
      {error && <Text style={styles.fieldErrorText}>{error}</Text>}
    </View>
  );
}

export function RecoveryPrimaryButton({
  disabled,
  isLoading,
  label,
  onPress,
}: RecoveryButtonProps) {
  const { colors, styles } = useRecoveryTheme();

  return (
    <Pressable
      disabled={disabled || isLoading}
      onPress={onPress}
      style={[styles.submitButtonWrapper, (disabled || isLoading) && styles.submitButtonDisabled]}
    >
      <LinearGradient
        colors={[colors.primaryDark, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.submitButton}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export function RecoveryTextButton({ disabled, label, onPress }: RecoveryButtonProps) {
  const { styles } = useRecoveryTheme();

  return (
    <Pressable disabled={disabled} onPress={onPress} style={styles.textButton}>
      <Text style={[styles.textButtonText, disabled && styles.textButtonTextDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function RecoveryMessage({ message, type }: RecoveryMessageProps) {
  const { colors, styles } = useRecoveryTheme();

  if (!message) {
    return null;
  }

  const isError = type === "error";

  return (
    <View
      accessibilityRole="alert"
      style={[styles.messageContainer, isError ? styles.errorContainer : styles.successContainer]}
    >
      <Ionicons
        name={isError ? "alert-circle-outline" : "checkmark-circle-outline"}
        size={18}
        color={isError ? colors.error : colors.success}
        style={styles.messageIcon}
      />
      <Text style={[styles.messageText, isError ? styles.errorText : styles.successText]}>
        {message}
      </Text>
    </View>
  );
}

const createStyles = (Colors: RecoveryThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: Colors.bgGradientStart,
    flex: 1,
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  glowBlob: {
    position: "absolute",
    borderRadius: 999,
  },
  glowSage: {
    width: 420,
    height: 420,
    top: -120,
    left: -150,
  },
  glowGold: {
    width: 360,
    height: 360,
    bottom: -120,
    right: -130,
  },
  keyboardView: {
    backgroundColor: Colors.bgGradientStart,
    flex: 1,
  },
  scrollContainer: {
    backgroundColor: Colors.bgGradientStart,
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 40,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 70 : 44,
  },
  card: {
    paddingBottom: 32,
    paddingHorizontal: 24,
    paddingTop: 36,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoImage: {
    height: 64,
    marginBottom: 12,
    width: 64,
  },
  title: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0,
    textAlign: "center",
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    letterSpacing: 0,
    lineHeight: 19,
    marginTop: 8,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0,
    marginBottom: 8,
  },
  inputContainer: {
    alignItems: "center",
    backgroundColor: Colors.inputBg,
    borderColor: Colors.inputBorder,
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: "row",
    height: 54,
    paddingHorizontal: 16,
  },
  inputContainerError: {
    backgroundColor: Colors.errorBg,
    borderColor: Colors.error,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    color: Colors.text,
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  fieldErrorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 6,
  },
  submitButtonWrapper: {
    borderRadius: 18,
    elevation: 6,
    marginBottom: 18,
    overflow: "hidden",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  submitButtonDisabled: {
    opacity: 0.72,
  },
  submitButton: {
    alignItems: "center",
    height: 54,
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0,
  },
  textButton: {
    alignItems: "center",
    paddingVertical: 6,
  },
  textButtonText: {
    color: Colors.accentDark,
    fontSize: 14,
    fontWeight: "700",
  },
  textButtonTextDisabled: {
    opacity: 0.54,
  },
  messageContainer: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 18,
    marginTop: -4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorContainer: {
    backgroundColor: Colors.errorBg,
    borderColor: Colors.errorBorder,
  },
  successContainer: {
    backgroundColor: Colors.successBg,
    borderColor: Colors.successBorder,
  },
  messageIcon: {
    marginRight: 8,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  errorText: {
    color: Colors.error,
  },
  successText: {
    color: Colors.success,
  },
  passwordToggle: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
});

export const passwordRecoveryStyles = StyleSheet.create({
  passwordToggle: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
});
