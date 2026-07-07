import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";

type StaffTextFieldProps = TextInputProps & {
  error?: string;
  label: string;
};

export function StaffTextField({ error, label, multiline, style, ...inputProps }: StaffTextFieldProps) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        multiline={multiline}
        placeholderTextColor={Colors.placeholder}
        style={[styles.input, multiline ? styles.textArea : null, style]}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  error: {
    color: Colors.error,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },
});
