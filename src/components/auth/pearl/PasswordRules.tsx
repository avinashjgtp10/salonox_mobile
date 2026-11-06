import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/AppTypography";

import { pearl } from "./tokens";

export type PasswordRuleState = { length: boolean; number: boolean; mixedCase: boolean; match: boolean };

/** Visual checklist only; it does not change which passwords the form accepts. */
export const getPasswordRuleState = (password: string, confirm: string): PasswordRuleState => ({
  length: password.length >= 8,
  number: /\d/.test(password),
  mixedCase: /[a-z]/.test(password) && /[A-Z]/.test(password),
  match: password.length > 0 && password === confirm,
});

const LABELS: [keyof PasswordRuleState, string][] = [
  ["length", "At least 8 characters"],
  ["number", "At least one number"],
  ["mixedCase", "Upper and lower case letters"],
  ["match", "Both passwords match"],
];

/** Live checklist: each rule ticks green as the user types. */
export function PasswordRules({ rules }: { rules: PasswordRuleState }) {
  return (
    <View style={styles.grid}>
      {LABELS.map(([key, label]) => {
        const ok = rules[key];
        return (
          <View key={key} style={styles.rule} accessibilityLabel={`${label}${ok ? ", done" : ""}`}>
            <View style={[styles.dot, ok && styles.dotOn]}>{ok ? <Ionicons name="checkmark" size={11} color={pearl.white} /> : null}</View>
            <Text style={[styles.text, ok && styles.textOn]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 8 },
  rule: { width: "50%", flexDirection: "row", alignItems: "center", gap: 7, paddingRight: 6 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.8, borderColor: "rgba(138,136,156,0.45)", alignItems: "center", justifyContent: "center" },
  dotOn: { backgroundColor: pearl.success, borderColor: pearl.success },
  text: { fontSize: 12, fontWeight: "600", color: pearl.muted, flexShrink: 1 },
  textOn: { color: pearl.successText },
});
