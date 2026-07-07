import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { PropsWithChildren, ReactNode } from "react";
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

export const RecoveryColors = {
  bgGradientStart: "#FAFBFA",
  bgGradientEnd: "#F4F7F5",
  primary: "#496A5D",
  primaryDark: "#365046",
  secondary: "#6D8F81",
  accent: "#C7A86D",
  accentDark: "#B18F54",
  text: "#243B34",
  textPrimary: "#445B55",
  textSecondary: "#7A8D87",
  placeholder: "#A8B7B1",
  cardBg: "#FFFFFF",
  cardBorder: "#E3E8E5",
  inputBg: "#FFFFFF",
  inputBorder: "#E3E8E5",
  error: "#D65B5B",
  errorBg: "rgba(214, 91, 91, 0.08)",
  success: "#4B8F68",
  successBg: "rgba(75, 143, 104, 0.1)",
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
  return (
    <LinearGradient
      colors={[RecoveryColors.bgGradientStart, RecoveryColors.bgGradientEnd]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="dark-content" backgroundColor={RecoveryColors.bgGradientStart} />

      <View pointerEvents="none" style={styles.blurContainer}>
        <LinearGradient
          colors={["rgba(73, 106, 93, 0.12)", "transparent"]}
          style={[styles.glowBlob, styles.glowSage]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={["rgba(199, 168, 109, 0.14)", "transparent"]}
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
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputContainer, error && styles.inputContainerError]}>
        <Ionicons
          name={iconName}
          size={20}
          color={RecoveryColors.secondary}
          style={styles.inputIcon}
        />
        <TextInput
          placeholderTextColor={RecoveryColors.placeholder}
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
  return (
    <Pressable
      disabled={disabled || isLoading}
      onPress={onPress}
      style={[styles.submitButtonWrapper, (disabled || isLoading) && styles.submitButtonDisabled]}
    >
      <LinearGradient
        colors={[RecoveryColors.primaryDark, RecoveryColors.primary]}
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
  return (
    <Pressable disabled={disabled} onPress={onPress} style={styles.textButton}>
      <Text style={[styles.textButtonText, disabled && styles.textButtonTextDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function RecoveryMessage({ message, type }: RecoveryMessageProps) {
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
        color={isError ? RecoveryColors.error : RecoveryColors.success}
        style={styles.messageIcon}
      />
      <Text style={[styles.messageText, isError ? styles.errorText : styles.successText]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    flex: 1,
  },
  scrollContainer: {
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
    color: RecoveryColors.text,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  subtitle: {
    color: RecoveryColors.textSecondary,
    fontSize: 13,
    letterSpacing: 0.2,
    lineHeight: 19,
    marginTop: 8,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: RecoveryColors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.1,
    marginBottom: 8,
  },
  inputContainer: {
    alignItems: "center",
    backgroundColor: RecoveryColors.inputBg,
    borderColor: RecoveryColors.inputBorder,
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: "row",
    height: 54,
    paddingHorizontal: 16,
  },
  inputContainerError: {
    backgroundColor: RecoveryColors.errorBg,
    borderColor: RecoveryColors.error,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    color: RecoveryColors.text,
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  fieldErrorText: {
    color: RecoveryColors.error,
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
    shadowColor: RecoveryColors.primaryDark,
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
    letterSpacing: 0.4,
  },
  textButton: {
    alignItems: "center",
    paddingVertical: 6,
  },
  textButtonText: {
    color: RecoveryColors.accentDark,
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
    backgroundColor: RecoveryColors.errorBg,
    borderColor: "rgba(214, 91, 91, 0.22)",
  },
  successContainer: {
    backgroundColor: RecoveryColors.successBg,
    borderColor: "rgba(75, 143, 104, 0.22)",
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
    color: RecoveryColors.error,
  },
  successText: {
    color: RecoveryColors.success,
  },
  passwordToggle: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
});

export const passwordRecoveryStyles = styles;
