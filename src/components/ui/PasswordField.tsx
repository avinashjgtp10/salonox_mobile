import { Text, TextInput } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useMemo, useState } from "react";
import { Pressable, StyleSheet, View, type TextInputProps } from "react-native";

import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import {
  usePearlColors,
  type PearlColors as ThemeColors,
} from "@/components/auth/pearl/usePearlColors";

type PasswordFieldProps = Omit<TextInputProps, "secureTextEntry" | "style"> & {
  pearlStyle?: boolean;
  error?: string;
  label: string;
  leadingIcon?: keyof typeof Ionicons.glyphMap;
};

export const PasswordField = forwardRef<TextInput, PasswordFieldProps>(
  function PasswordField(
    { pearlStyle = false, error, label, leadingIcon, ...inputProps },
    ref,
  ) {
    const Colors = usePearlColors(pearlStyle);
    const styles = useMemo(() => createStyles(Colors), [Colors]);
    const [isVisible, setIsVisible] = useState(false);

    return (
      <View style={styles.group}>
        <Text translate style={[styles.label, pearlStyle && { fontWeight: "600" }]}>
          {label}
        </Text>
        <View
          style={[
            styles.inputRow,
            pearlStyle && {
              borderRadius: 16,
              backgroundColor: Colors.backgroundElement,
              borderColor: Colors.border,
            },
            error ? styles.inputRowError : null,
          ]}
        >
          {leadingIcon && <Ionicons name={leadingIcon} size={18} color={Colors.text2} style={{ marginRight: 8 }} />}
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
            <Ionicons
              name={isVisible ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={Colors.text2}
            />
          </Pressable>
        </View>
        {error ? <Text translate style={styles.error}>{error}</Text> : null}
      </View>
    );
  },
);

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
