import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useState } from "react";
import { Pressable, StyleSheet, View, type TextInputProps } from "react-native";

import { Text, TextInput } from "@/components/ui/AppTypography";

import { pearl, pearlRadius, pearlType } from "./tokens";

type Props = TextInputProps & {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Message under the field. Pass `true` to only highlight the field. */
  error?: string | boolean | null;
  hint?: string;
  /** Text shown before the value, e.g. a currency sign. */
  prefix?: string;
  /** Adds a "*" after the label. */
  required?: boolean;
  /** Adds the show/hide password button and manages `secureTextEntry`. */
  secureToggle?: boolean;
};

/** Labelled pearl input with focus ring, inline error and optional show/hide password. */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, icon, error, hint, prefix, required, secureToggle, secureTextEntry, onFocus, onBlur, style, ...input },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isSecure = secureToggle ? hidden : secureTextEntry;
  const message = typeof error === "string" && error.trim() ? error : null;

  return (
    <View style={styles.group}>
      <Text style={pearlType.label}>{label}{required ? <Text style={{ color: pearl.dangerText }}> *</Text> : null}</Text>
      <View style={[styles.field, focused && styles.focus, !!error && styles.bad]}>
        {icon ? <Ionicons name={icon} size={18} color={pearl.muted} /> : null}
        {prefix ? <Text style={[pearlType.input, { color: pearl.muted }]}>{prefix}</Text> : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={message ?? hint}
          placeholderTextColor={pearl.placeholder}
          secureTextEntry={isSecure}
          style={[styles.input, style]}
          onFocus={(event) => { setFocused(true); onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); onBlur?.(event); }}
          {...input}
        />
        {secureToggle ? (
          <Pressable
            onPress={() => setHidden((value) => !value)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            style={[styles.eye, !hidden && styles.eyeOn]}
          >
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={18} color={pearl.muted} />
          </Pressable>
        ) : null}
      </View>
      {message ? (
        <View style={styles.errRow} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle-outline" size={14} color={pearl.dangerText} style={styles.errIcon} />
          <Text style={[pearlType.error, styles.flex]}>{message}</Text>
        </View>
      ) : hint ? <Text style={pearlType.small}>{hint}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  group: { gap: 7 },
  field: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: pearlRadius.field,
    backgroundColor: pearl.field,
    borderWidth: 1,
    borderColor: pearl.fieldBorder,
  },
  focus: { borderColor: pearl.accent, borderWidth: 1.5, backgroundColor: pearl.fieldFocus },
  bad: { borderColor: pearl.dangerFieldBorder, borderWidth: 1.5, backgroundColor: pearl.dangerField },
  input: { flex: 1, height: "100%", paddingVertical: 0, ...pearlType.input },
  eye: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  eyeOn: { backgroundColor: pearl.accentWash },
  errRow: { flexDirection: "row", gap: 6, alignItems: "flex-start", marginTop: 1, paddingRight: 8 },
  errIcon: { marginTop: 1 },
  flex: { flex: 1 },
});
