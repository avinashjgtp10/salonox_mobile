import { useRegionalPreferences } from "@/localization/preferences";
import { currencyLabel, currencyLocale, formatCurrencyCompact } from "@/utils/currency";
/** Monthly target (prototype) — validated amount + presets; saves with the existing API. */
import { useEffect, useState } from "react";
import { Keyboard, Pressable, StyleSheet, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/auth/pearl/Buttons";
import { TextField } from "@/components/auth/pearl/TextField";
import { pearl, pearlType } from "@/components/auth/pearl/tokens";
import { BottomSheet } from "@/components/pearl/Sheet";
import { Text } from "@/components/ui/AppTypography";
import { useAppToast } from "@/hooks/useAppToast";
import { ApiError } from "@/services/api";
import { monthlyProjectionService } from "@/services/monthlyProjection.service";

const MIN = 10000;
const MAX = 10000000;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** 5,00,000 */
export const groupIN = (value: number) => Math.round(value).toLocaleString(currencyLocale());
/** ₹4.5L · ₹1.2Cr · ₹950 */
export const inrShort = (value: number) => formatCurrencyCompact(value);

const parse = (raw: string) => Number(raw.replace(/[^\d]/g, ""));

export function validateTarget(raw: string): string | null {
  if (!raw.trim()) return "Please enter your monthly target.";
  if (!/^[\d,\s]+$/.test(raw.trim())) return "Please enter a valid amount using numbers only, for example 500000.";
  const amount = parse(raw);
  if (amount < MIN) return `Monthly target must be at least ${currencyLabel("\u20b9")}${groupIN(MIN)}.`;
  if (amount > MAX) return `Monthly target can’t be more than ${currencyLabel("\u20b9")}${groupIN(MAX)}.`;
  return null;
}

const roundTo = (value: number, step: number) => Math.max(MIN, Math.round(value / step) * step);

export function EditTargetSheet({ visible, onClose, current, lastMonth, onSaved }: {
  visible: boolean; onClose: () => void; current: number | null; lastMonth: number; onSaved: () => void;
}) {
  "use no memo";
  useRegionalPreferences();
  const toast = useAppToast();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const month = MONTHS[new Date().getMonth()];

  useEffect(() => {
    if (visible) { setValue(current ? groupIN(current) : ""); setError(null); }
  }, [visible, current]);

  const presets = (() => {
    const base = current ?? (lastMonth > 0 ? lastMonth : 500000);
    const step = base >= 1e6 ? 100000 : 50000;
    const list = [roundTo(base * 0.9, step), roundTo(base, step), roundTo(base * 1.1, step)]
      .map(amount => ({ label: inrShort(amount), amount }));
    if (lastMonth > 0) list.push({ label: "Last month +10%", amount: roundTo(lastMonth * 1.1, 1000) });
    return list.filter((preset, index, all) => all.findIndex(other => other.label === preset.label) === index);
  })();

  const persist = async (target: number | null) => {
    setSaving(true);
    try {
      await monthlyProjectionService.setTarget(target);
      Keyboard.dismiss();
      onSaved();
      onClose();
      toast.showSuccess(target === null ? "Target removed" : "Target saved");
    } catch (err) {
      const offline = err instanceof ApiError && err.status === undefined;
      setError(offline ? "You’re offline. Please connect to the internet to save." : "Couldn’t save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    const problem = validateTarget(value);
    setError(problem);
    if (!problem) void persist(parse(value));
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Monthly target">
      <TextField
        label={`Target for ${month}`}
        required
        prefix={currencyLabel("₹")}
        value={value}
        error={error}
        keyboardType="number-pad"
        placeholder="5,00,000"
        hint={`Between ${currencyLabel("\u20b9")}${groupIN(MIN)} and ${currencyLabel("\u20b9")}${groupIN(MAX)}.`}
        onChangeText={text => { setValue(text); setError(null); }}
        onBlur={() => { if (value) setError(validateTarget(value)); }}
        editable={!saving}
      />
      <View style={styles.presets}>
        {presets.map(preset => {
          const on = parse(value) === preset.amount;
          return (
            <Pressable key={preset.label} onPress={() => { setValue(groupIN(preset.amount)); setError(null); }}
              style={[styles.preset, on && styles.on]} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <Text translate style={[styles.presetText, on && { color: "#fff" }]}>{preset.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <PrimaryButton title="Save target" loading={saving} loadingTitle="Saving…" onPress={save} />
      {current ? <TextButton title="Remove target" disabled={saving} onPress={() => void persist(null)} /> : null}
      <Text translate style={[pearlType.small, { textAlign: "center" }]}>Used for the dashboard progress bar and projection.</Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  presets: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  preset: { height: 34, paddingHorizontal: 13, borderRadius: 12, justifyContent: "center", backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: pearl.glassBorder },
  on: { backgroundColor: pearl.accent, borderColor: pearl.accent },
  presetText: { fontWeight: "600", fontSize: 12.5, color: pearl.ink2 },
});
