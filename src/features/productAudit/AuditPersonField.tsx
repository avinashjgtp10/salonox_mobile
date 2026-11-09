import { BottomSheet } from "@/components/ui/BottomSheet";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { usePearlColors as useThemeColors } from "@/components/auth/pearl/usePearlColors";
import { productAuditService } from "@/services/productAudit.service";
import { getApiErrorMessage } from "@/services/api";
import type { AuditPerson } from "@/types/productAudit";
import { AuditButton } from "./AuditUI";

export function AuditPersonField({ label, value, onChange, currentUser, excludeId, disabled = false }: {
  label: string; value: AuditPerson | null; onChange: (person: AuditPerson) => void;
  currentUser: AuditPerson; excludeId?: string; disabled?: boolean;
}) {
  const c = useThemeColors();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AuditPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    void productAuditService.people(controller.signal).then(people => {
      if (!controller.signal.aborted) { setRows(people); setLoading(false); }
    }).catch(e => {
      if (!controller.signal.aborted) { setError(getApiErrorMessage(e)); setLoading(false); }
    });
    return () => controller.abort();
  }, [open, revision]);
  const options = useMemo(() => [...new Map([currentUser, ...rows].filter(p => p.id && p.id !== excludeId).map(p => [p.id, p])).values()]
    .filter(p => p.name.toLowerCase().includes(search.trim().toLowerCase())), [currentUser, rows, excludeId, search]);
  return <View style={{ gap: 8 }}>
    <Text translate style={{ color: c.text2 }}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`Select ${label.toLowerCase()}`} disabled={disabled}
      onPress={() => { setSearch(""); setOpen(true); }} style={{ borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14, backgroundColor: c.card, opacity: disabled ? 0.5 : 1 }}>
      <Text style={{ color: c.heading }}>{value?.name || "Select a staff member"}</Text>
    </Pressable>
    <Modal visible={open} transparent statusBarTranslucent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1 }}><BottomSheet visible={open} renderInline pearlStyle centered={false} avoidKeyboard title={`Select ${label.toLowerCase()}`} onClose={() => setOpen(false)}>
      <View style={{ padding: 16, gap: 12 }}>
        <TextInput accessibilityLabel="Search staff" value={search} onChangeText={setSearch} placeholder="Search staff" placeholderTextColor={c.text2} style={{ color: c.text, padding: 12, borderWidth: 1, borderColor: c.border, borderRadius: 16 }} />
        {loading && <ActivityIndicator />}
        {!!error && <><Text translate accessibilityRole="alert" style={{ color: c.error }}>{error}</Text><AuditButton label="Retry loading staff" onPress={() => setRevision(n => n + 1)} /></>}
        {options.map(person => <Pressable key={person.id} accessibilityRole="button" accessibilityState={{ selected: value?.id === person.id }} onPress={() => { onChange(person); setOpen(false); }} style={{ padding: 14, borderRadius: 16, backgroundColor: value?.id === person.id ? c.backgroundSelected : c.card }}><Text style={{ color: c.text }}>{person.name}{person.id === currentUser.id ? " (You)" : ""}</Text></Pressable>)}
        {!loading && !error && !options.length && <Text translate style={{ color: c.text2 }}>{search ? "No matching staff found." : "No other staff with a linked login account found."}</Text>}
        {!!excludeId && <Text translate style={{ color: c.text2 }}>The reviewer must be different from the auditor.</Text>}
      </View>
      </BottomSheet></View>
    </Modal>
  </View>;
}
