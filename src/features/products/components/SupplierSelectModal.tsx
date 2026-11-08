import { BottomSheet } from "@/components/ui/BottomSheet";
import { useEffect, useState } from "react";
import { Pressable, ScrollView } from "react-native";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { supplierService, type ProductSupplierOption } from "@/services/supplier.service";
import { getApiErrorMessage } from "@/services/api";
import { usePearlColors } from "@/components/auth/pearl/usePearlColors";

export function SupplierSelectModal({ visible, initialCreate, canCreate, onClose, onSelect }: {
  visible: boolean; initialCreate: boolean; canCreate: boolean;
  onClose: () => void; onSelect: (supplier: ProductSupplierOption | null) => void;
}) {
  const colors = usePearlColors();
  const [suppliers, setSuppliers] = useState<ProductSupplierOption[]>([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(initialCreate);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let active = true;
    setSearch(""); setCreating(initialCreate); setError(""); setLoading(true);
    supplierService.list().then((items) => { if (active) setSuppliers(items); })
      .catch((e) => { if (active) setError(getApiErrorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [visible, initialCreate, retry]);
  const select = (supplier: ProductSupplierOption | null) => { onSelect(supplier); onClose(); };
  const create = async () => {
    if (saving || !canCreate || !search.trim()) return;
    setSaving(true); setError("");
    try { select(await supplierService.create(search)); }
    catch (e) { setError(getApiErrorMessage(e)); }
    finally { setSaving(false); }
  };
  const button = { padding: 14, borderRadius: 16, backgroundColor: colors.primary, marginTop: 12 };
  return (
    <BottomSheet pearlStyle centered={false} avoidKeyboard visible={visible} title={creating ? "Add supplier" : "Select supplier"} onClose={() => { if (!saving) onClose(); }}>
          <TextInput value={search} onChangeText={setSearch} editable={!saving} placeholder={creating ? "Supplier name" : "Search suppliers"}
            placeholderTextColor={colors.placeholder} style={{ color: colors.heading, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 12, minHeight: 48 }} />
          {!!error && <Text style={{ color: colors.error, marginTop: 12 }}>{error}</Text>}
          {creating ? (
            <Pressable disabled={saving || !search.trim()} onPress={() => void create()} style={[button, { opacity: saving || !search.trim() ? 0.5 : 1 }]}>
              <Text style={{ color: colors.onPrimary, textAlign: "center", fontWeight: "800" }}>{saving ? "Adding…" : "Save supplier"}</Text>
            </Pressable>
          ) : (
            <>
              {loading && <ActivityIndicator />}
              {!loading && !!error && <Pressable onPress={() => setRetry((n) => n + 1)} style={button}><Text style={{ color: colors.onPrimary }}>Retry loading suppliers</Text></Pressable>}
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 300 }}>
                {[{ id: "", name: "None", is_active: true }, ...suppliers.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()))].map((supplier) => (
                  <Pressable key={supplier.id || "none"} onPress={() => select(supplier.id ? supplier : null)} style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ color: colors.heading }}>{supplier.name}</Text>
                  </Pressable>
                ))}
                {!loading && !suppliers.length && !error && <Text style={{ color: colors.text2, paddingVertical: 12 }}>No suppliers yet.</Text>}
              </ScrollView>
              {canCreate && <Pressable style={button} onPress={() => { setCreating(true); setSearch(""); setError(""); }}><Text style={{ color: colors.onPrimary }}>+ Add supplier</Text></Pressable>}
            </>
          )}
          <Pressable disabled={saving} onPress={onClose} style={{ padding: 16 }}><Text style={{ color: colors.heading, textAlign: "center" }}>Close</Text></Pressable>
    </BottomSheet>
  );
}
