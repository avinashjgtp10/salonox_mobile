import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Text, TextInput } from "@/components/ui/AppTypography";

import { pearl } from "./tokens";

/**
 * Six-box code input. One transparent TextInput is laid over all the boxes, so a
 * tap anywhere on them is a real tap on the input: Android reopens the keyboard
 * even when the input is still focused, and paste / SMS / "From Mail" autofill work.
 */
export function OtpInput({ value, onChange, onSubmit, error, length = 6, autoFocus = false }: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  error?: boolean;
  length?: number;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const digits = value.split("");
  return (
    <View>
      <View style={styles.row} pointerEvents="none">
        {Array.from({ length }).map((_, i) => {
          const active = focused && i === Math.min(value.length, length - 1);
          return (
            <View key={i} style={[styles.box, active && styles.active, error && styles.bad]}>
              <Text style={styles.digit}>{digits[i] ?? ""}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={onSubmit}
        accessibilityLabel="Verification code"
        accessibilityHint={`Enter the ${length}-digit code from your email`}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus={autoFocus}
        caretHidden
        selectionColor="transparent"
        underlineColorAndroid="transparent"
        style={styles.overlay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  box: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: pearl.fieldBorder,
  },
  active: { borderColor: pearl.accent, borderWidth: 1.5 },
  bad: { borderColor: pearl.dangerFieldBorder, borderWidth: 1.5, backgroundColor: pearl.dangerField },
  digit: { fontSize: 22, fontWeight: "800", color: pearl.ink },
  // Covers the boxes and receives the taps, but draws nothing itself.
  overlay: {
    ...StyleSheet.absoluteFillObject,
    color: "transparent",
    backgroundColor: "transparent",
    fontSize: 1,
    opacity: 0.02,
  },
});
