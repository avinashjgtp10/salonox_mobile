import { PearlActionFooter } from "@/components/ui/PearlActionFooter";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/ui/AppTypography";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { pearl, pearlGradients } from "@/components/auth/pearl/tokens";

export function CatalogFormFooter({ label, loading, onCancel, onSave }: { label: string; loading: boolean; onCancel: () => void; onSave: () => void }) {
  const insets = useSafeAreaInsets();
  return <PearlActionFooter bottomInset={insets.bottom}>
    <TouchableOpacity disabled={loading} onPress={onCancel} style={s.cancel}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
    <TouchableOpacity disabled={loading} onPress={onSave} style={[s.save, loading && { opacity: 0.65 }]}>
      <LinearGradient colors={pearlGradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}<Text style={s.saveText}>{loading ? "Saving…" : label}</Text>
    </TouchableOpacity>
  </PearlActionFooter>;
}
const s = StyleSheet.create({ cancel: { minHeight: 50, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: pearl.glass, borderWidth: 1, borderColor: "rgba(126,120,176,0.45)" }, save: { flex: 1, minHeight: 50, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderRadius: 16, overflow: "hidden" }, cancelText: { fontSize: 14, fontWeight: "700", color: pearl.accentDeep }, saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" } });
