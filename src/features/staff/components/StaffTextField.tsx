import { forwardRef, useMemo } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

type StaffTextFieldProps = TextInputProps & {
  error?: string;
  label: string;
};

export const StaffTextField = forwardRef<TextInput, StaffTextFieldProps>(function StaffTextField({ error, label, multiline, style, ...inputProps }, ref) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        multiline={multiline}
        placeholderTextColor={Colors.placeholder}
        style={[styles.input, multiline ? styles.textArea : null, error ? styles.inputError : null, style]}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  group: {
    marginBottom: Spacing.md,
  },
  label: {
    color: Colors.heading,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    color: Colors.heading,
    fontSize: 14,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  textArea: {
    minHeight: 86,
    paddingTop: 13,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: Colors.error,
    borderWidth: 1.5,
  },
  error: {
    color: Colors.error,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },
});
