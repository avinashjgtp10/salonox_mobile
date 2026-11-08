import { StyleSheet, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/AppTypography";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { pearl, pearlGradients, pearlTones } from "@/components/auth/pearl/tokens";

export function ClientButton({ label, onPress, loading = false, secondary = false }: { label: string; onPress: () => void; loading?: boolean; secondary?: boolean }) {
  return <TouchableOpacity accessibilityRole="button" disabled={loading} onPress={onPress} style={[clientUi.button, secondary && clientUi.secondary, loading && { opacity: 0.65 }]}>
    {!secondary ? <LinearGradient pointerEvents="none" colors={pearlGradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
    {loading ? <ActivityIndicator color={secondary ? pearl.accentDeep : "#FFFFFF"} size="small" /> : null}<Text style={[clientUi.buttonText, secondary && { color: pearl.accentDeep }]}>{label}</Text>
  </TouchableOpacity>;
}
export function ClientMenuRow({ icon, title, onPress, hint, tone = "lilac", showChevron = true }: { icon: keyof typeof Ionicons.glyphMap; title: string; onPress: () => void; hint?: string; tone?: "lilac" | "peach" | "rose"; showChevron?: boolean }) {
  const colors = pearlTones[tone];
  return <TouchableOpacity accessibilityRole="button" onPress={onPress} style={clientUi.menuRow}><View style={[clientUi.icon, { backgroundColor: colors.bg }]}><Ionicons name={icon} size={20} color={colors.fg} /></View><View style={{ flex: 1 }}><Text style={clientUi.rowTitle}>{title}</Text>{hint ? <Text style={clientUi.muted}>{hint}</Text> : null}</View>{showChevron ? <Ionicons name="chevron-forward" size={17} color={pearl.muted} /> : null}</TouchableOpacity>;
}
export function ClientChips({ options, selected, onSelect }: { options: readonly string[]; selected: string; onSelect: (value: string) => void }) {
  return <View style={clientUi.chips}>{options.map((label) => <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: selected === label }} key={label} onPress={() => onSelect(label)} style={[clientUi.chip, selected === label && clientUi.chipSelected]}><Text style={[clientUi.chipText, selected === label && { color: pearl.accentDeep }]}>{label}</Text></TouchableOpacity>)}</View>;
}
export const clientUi = StyleSheet.create({
  card: { borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: pearl.glassBorder, backgroundColor: pearl.glass },
  menuRow: { padding: 14, minHeight: 66, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: pearl.divider },
  rowTitle: { color: pearl.ink, fontSize: 14, fontWeight: "700" }, muted: { color: pearl.muted, fontSize: 12, lineHeight: 18 },
  icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: pearlTones.lilac.bg, alignItems: "center", justifyContent: "center" },
  label: { color: pearl.ink2, fontSize: 12, fontWeight: "600", marginBottom: 8 },
  input: { borderRadius: 16, borderWidth: 1, borderColor: pearl.fieldBorder, backgroundColor: pearl.field, color: pearl.ink, fontSize: 14, minHeight: 48, paddingHorizontal: 14, paddingVertical: 12 },
  error: { color: pearl.dangerText, fontSize: 12, lineHeight: 18 },
  button: { minHeight: 50, borderRadius: 16, overflow: "hidden", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 18 },
  secondary: { borderWidth: 1, borderColor: pearl.glassBorder, backgroundColor: pearl.glass }, buttonText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { borderRadius: 20, paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1, borderColor: pearl.glassBorder, backgroundColor: pearl.glass }, chipSelected: { borderColor: pearl.accentTint, backgroundColor: pearl.accentWash }, chipText: { color: pearl.ink2, fontSize: 12, fontWeight: "600" },
});
