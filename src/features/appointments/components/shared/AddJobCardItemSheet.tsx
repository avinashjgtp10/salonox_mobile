import { useEffect, useMemo, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";

import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { pearl } from "@/components/auth/pearl/themedPearl";
import { staffUi } from "@/features/staff/components/StaffPearl";
import { getApiErrorMessage } from "@/services/api";
import { productService } from "@/services/product.service";
import type { PosServiceItem } from "@/types/sales";
import type { JobCardItemDraft } from "../../utils/addJobCardItem";

type CatalogEntry = { id: string; name: string; price: number };

/**
 * Mid-service add: the staff member doing the work opens the appointment on
 * their own phone, picks a service or product the client just asked for, and it
 * is appended to the job card under THEIR name — no owner, no Quick Sale.
 */
export function AddJobCardItemSheet({ visible, services, staffId, staffName, staffOptions, saving, onClose, onAdd }: {
  visible: boolean;
  services: PosServiceItem[];
  staffId: string;
  staffName: string;
  /** Who the line can be assigned to. Defaults to whoever opened the sheet. */
  staffOptions: { id: string; name: string }[];
  saving: boolean;
  onClose: () => void;
  onAdd: (draft: JobCardItemDraft) => void;
}) {
  const [tab, setTab] = useState<"product" | "service">("service");
  const [assignedStaffId, setAssignedStaffId] = useState(staffId);
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<CatalogEntry[] | null>(null);
  const [productsError, setProductsError] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Services arrive with the sales init data the staff appointment screen
  // already loads; products are fetched the first time the tab is opened.
  useEffect(() => {
    if (!visible || tab !== "product" || products || loadingProducts) return;
    setLoadingProducts(true);
    setProductsError("");
    productService
      // Retail lines only: consumables are stock used during a service, not
      // something a client is billed for.
      .fetchProducts({
        isActive: true,
        limit: 200,
        offset: 0,
        productType: "retail,both",
        search: "",
        sort_by: "name",
        sort_order: "asc",
      })
      .then((result) => setProducts(result.products.map((item) => ({ id: item.id, name: item.name, price: item.price }))))
      .catch((failure) => setProductsError(getApiErrorMessage(failure)))
      .finally(() => setLoadingProducts(false));
  }, [loadingProducts, products, tab, visible]);

  const entries = useMemo<CatalogEntry[]>(() => {
    const source: CatalogEntry[] = tab === "service"
      ? services.map((item) => ({ id: item.id, name: item.name, price: item.price }))
      : products ?? [];
    const query = search.trim().toLowerCase();
    return query ? source.filter((item) => item.name.toLowerCase().includes(query)) : source;
  }, [products, search, services, tab]);

  const loading = tab === "product" && loadingProducts;
  // Whoever opened the sheet always appears, even if the roster has not loaded
  // or leaves them out, so the default assignment is never an empty choice.
  const assignable = useMemo(
    () => (staffOptions.some((member) => member.id === staffId)
      ? staffOptions
      : [{ id: staffId, name: staffName }, ...staffOptions]),
    [staffId, staffName, staffOptions],
  );
  const assignedStaff = assignable.find((member) => member.id === assignedStaffId);

  return (
    <BottomSheet
      pearlStyle
      centered={false}
      visible={visible}
      title="Add to this appointment"
      onClose={() => { if (!saving) onClose(); }}
    >
      <View style={{ gap: 12 }}>
        <Text translate style={staffUi.muted}>
          Added under the staff member below. Assign it to someone else and they
          are notified it is waiting for them.
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {assignable.map((member) => {
              const active = member.id === assignedStaffId;
              return (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  disabled={saving}
                  key={member.id}
                  onPress={() => setAssignedStaffId(member.id)}
                  style={{
                    backgroundColor: active ? pearl.accent : "transparent",
                    borderColor: active ? pearl.accent : pearl.divider,
                    borderRadius: 999,
                    borderWidth: 1,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ color: active ? "#FFFFFF" : pearl.muted, fontWeight: "600" }}>
                    {member.id === staffId ? `${member.name} (you)` : member.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        <View style={staffUi.tabs}>
          {(["service", "product"] as const).map((option) => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected: tab === option }}
              disabled={saving}
              key={option}
              onPress={() => setTab(option)}
              style={[staffUi.tab, tab === option && { backgroundColor: pearl.glassStrong }]}
            >
              <Text style={staffUi.rowTitle}>{option === "service" ? "Services" : "Products"}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          accessibilityLabel="Search catalog"
          onChangeText={setSearch}
          placeholder={tab === "service" ? "Search services" : "Search products"}
          placeholderTextColor={pearl.placeholder}
          style={staffUi.input}
          value={search}
        />
        {productsError ? <Text style={staffUi.error}>{productsError}</Text> : null}
        {loading ? <ActivityIndicator /> : null}
        {!loading && entries.length === 0 ? (
          <Text translate style={staffUi.muted}>Nothing matches that.</Text>
        ) : null}
        <ScrollView style={{ maxHeight: 320 }}>
          {entries.map((item) => (
            <TouchableOpacity
              accessibilityRole="button"
              disabled={saving}
              key={item.id}
              onPress={() => onAdd({
                catalogId: item.id,
                kind: tab,
                name: item.name,
                price: item.price,
                staffId: assignedStaffId,
                staffName: assignedStaff?.name ?? staffName,
              })}
              style={[staffUi.menuRow, { borderBottomWidth: 0, opacity: saving ? 0.5 : 1 }]}
            >
              <Text style={[staffUi.rowTitle, { flex: 1 }]}>{item.name}</Text>
              <Text style={staffUi.muted}>{item.price}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </BottomSheet>
  );
}
