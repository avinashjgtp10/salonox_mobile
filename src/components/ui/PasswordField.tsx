import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

type PasswordFieldProps = Omit<TextInputProps, "secureTextEntry" | "style"> & {
  error?: string;
  label: string;
};

// Generic secure-text input with a show/hide toggle. Visibility state lives
// entirely inside this component, so two instances on the same screen (e.g.
// Password + Confirm Password) are independent by construction — no shared
// state to accidentally wire together.
export const PasswordField = forwardRef<TextInput, PasswordFieldProps>(function PasswordField({ error, label, ...inputProps }, ref) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        <TextInput
          ref={ref}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={Colors.placeholder}
          secureTextEntry={!isVisible}
          style={styles.input}
          {...inputProps}
        />
        <Pressable
          accessibilityLabel={isVisible ? `Hide ${label}` : `Show ${label}`}
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => setIsVisible((current) => !current)}
        >
          <Ionicons name={isVisible ? "eye-off-outline" : "eye-outline"} size={18} color={Colors.text2} />
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    group: {
      marginBottom: Spacing.md,
    },
    label: {
      color: Colors.heading,
      fontSize: 12,
      fontWeight: "800",
      marginBottom: 8,
    },
    inputRow: {
      alignItems: "center",
      backgroundColor: Colors.bg2,
      borderColor: Colors.border,
      borderRadius: Radius.md,
      borderWidth: 1,
      flexDirection: "row",
      minHeight: 48,
      paddingHorizontal: 14,
    },
    inputRowError: {
      borderColor: Colors.error,
    },
    input: {
      color: Colors.heading,
      flex: 1,
      fontSize: 14,
      paddingVertical: 12,
    },
    error: {
      color: Colors.error,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 6,
    },
  });
