import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { forwardRef, useMemo } from "react";
import { StyleSheet, View, type TextInputProps } from "react-native";

import {
  usePearlColors,
  type PearlColors as ThemeColors,
} from "@/components/auth/pearl/usePearlColors";

type StaffTextFieldProps = TextInputProps & {
  error?: string;
  label: string;
};

export const StaffTextField = forwardRef<TextInput, StaffTextFieldProps>(
  function StaffTextField(
    { error, label, multiline, style, ...inputProps },
    ref,
  ) {
    const Colors = usePearlColors();
    const palette = usePearlPalette();
    const styles = useMemo(() => createStyles(Colors, palette), [Colors, palette]);

    return (
      <View style={styles.group}>
        <Text translate style={styles.label}>{label}</Text>
        <TextInput
          ref={ref}
          multiline={multiline}
          placeholderTextColor={Colors.placeholder}
          style={[
            styles.input,
            multiline ? styles.textArea : null,
            error ? styles.inputError : null,
            style,
          ]}
          {...inputProps}
        />
        {error ? <Text translate style={styles.error}>{error}</Text> : null}
      </View>
    );
  },
);

const createStyles = (Colors: ThemeColors, palette: ReturnType<typeof usePearlPalette>) =>
  StyleSheet.create({
    group: {
      marginBottom: 0,
    },
    label: {
      color: Colors.heading,
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 8,
    },
    input: {
      backgroundColor: palette.field,
      borderColor: palette.fieldBorder,
      borderRadius: 16,
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
