import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl, pearlGradients } from "@/components/auth/pearl/tokens";
import { IconButton } from "@/components/pearl/ui";
import { LinearGradient } from "expo-linear-gradient";
import { PearlCatalogRow } from "@/features/quickSale/components/PearlCatalogRow";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { formatDurationLabel } from "@/features/appointments/utils/appointmentForm";
import type { AppointmentItemKind, AppointmentSelectedService } from "@/features/appointments/types/appointmentForm";
import { MembershipCatalogTab } from "@/features/quickSale/components/MembershipCatalogTab";
import { PackageCatalogTab } from "@/features/quickSale/components/PackageCatalogTab";
import { ProductCatalogTab } from "@/features/quickSale/components/ProductCatalogTab";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ClientPackage } from "@/types/package";
import type { ServiceListItem } from "@/types/service";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const NO_CLIENT_PACKAGES: ClientPackage[] = [];

export type PickerTab = "service" | AppointmentItemKind;

const PICKER_TABS: { key: PickerTab; label: string; noun: string }[] = [
  { key: "service", label: "Services", noun: "services" },
  { key: "product", label: "Products", noun: "products" },
  { key: "membership", label: "Memberships", noun: "memberships" },
  { key: "package", label: "Packages", noun: "packages" },
];

export function ServiceCatalogPicker({
  clientId,
  error,
  initialTab = "service",
  loading,
  onClose,
  onContinue,
  onSelect,
  onToggleItem,
  salonId,
  selectedItems,
  selectedServiceIds,
  services,
  visible,
}: {
  clientId?: string | null;
  error: string | null;
  // Tab shown each time the picker opens (the Quick Sale style "+ Product" chips).
  initialTab?: PickerTab;
  loading: boolean;
  onClose: () => void;
  onContinue: () => void;
  onSelect: (service: ServiceListItem) => void;
  onToggleItem: (kind: AppointmentItemKind, item: { categoryId?: string | null; id: string; name: string; price: number }) => void;
  salonId?: string | null;
  selectedItems: AppointmentSelectedService[];
  selectedServiceIds: string[];
  services: ServiceListItem[];
  visible: boolean;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<PickerTab>(initialTab);
  useEffect(() => {
    if (visible) setTab(initialTab);
  }, [initialTab, visible]);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const activeTab = PICKER_TABS.find((item) => item.key === tab) ?? PICKER_TABS[0];

  const addedIdsForTab = useMemo(
    () => new Set(selectedItems.filter((item) => item.itemKind === tab).map((item) => item.catalogServiceId ?? item.id)),
    [selectedItems, tab],
  );
  const totalSelected = selectedServiceIds.length + selectedItems.length;
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(services.map((service) => service.category).filter(Boolean) as string[]))],
    [services],
  );
  const filteredServices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return services.filter((service) => {
      const categoryMatches = category === "All" || service.category === category;
      const queryMatches = !normalizedQuery || service.name.toLowerCase().includes(normalizedQuery);

      return categoryMatches && queryMatches;
    });
  }, [category, query, services]);

  return (
    <Modal animationType="slide" transparent onRequestClose={onClose} visible={visible}>
      <View style={ui.overlay}><Pressable accessibilityLabel="Close item picker" onPress={onClose} style={StyleSheet.absoluteFill} /><View style={[ui.panel, { marginTop: insets.top + 32 }]}><PearlBackground>
      <SafeAreaView edges={[]} style={{ flex: 1 }}>
        <View style={ui.handle} />
        <AppStatusBar />
        <View style={ui.header}>
          <Text style={ui.title}>Add {activeTab.noun}</Text>
          <IconButton icon="x" label="Close" onPress={onClose} size={34} />
        </View>

        <View style={ui.body}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={ui.tabs}>
            {PICKER_TABS.map((item) => {
              const active = item.key === tab;
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.84}
                  onPress={() => setTab(item.key)}
                  style={[ui.chip, active && ui.chipOn]}
                >
                  <Text translate numberOfLines={1} style={[ui.chipText, active && { color: "#fff" }]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={ui.search}>
            <TextInput
              autoCorrect={false}
              onChangeText={setQuery}
              placeholder={tab === "service" ? `Search ${services.length} services` : `Search ${activeTab.noun}`}
              placeholderTextColor={Colors.appointmentPlaceholder}
              style={ui.input}
              value={query}
            />
            {query ? (
              <TouchableOpacity accessibilityLabel="Clear service search" onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={22} color={Colors.appointmentMuted} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="search-outline" size={28} color={Colors.appointmentText} />
            )}
          </View>

          {tab !== "service" ? (
            <>
              <View style={styles.catalogTabBody}>
                {tab === "product" ? (
                  <ProductCatalogTab pearlStyle
                    onSelect={(product) => onToggleItem("product", { categoryId: product.categoryId, id: product.id, name: product.name, price: product.price })}
                    search={query}
                    selectedIds={addedIdsForTab}
                  />
                ) : tab === "membership" ? (
                  <MembershipCatalogTab pearlStyle
                    clientId={clientId}
                    onSelect={(membership) => onToggleItem("membership", { id: membership.id, name: membership.name, price: membership.price })}
                    salonId={salonId}
                    search={query}
                    selectedIds={addedIdsForTab}
                  />
                ) : (
                  <PackageCatalogTab pearlStyle
                    activeClientPackages={NO_CLIENT_PACKAGES}
                    onSelect={(pkg) => onToggleItem("package", { id: pkg.id, name: pkg.name, price: pkg.basePrice })}
                    salonId={salonId}
                    search={query}
                    selectedIds={addedIdsForTab}
                  />
                )}
              </View>
            </>
          ) : (
          <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginVertical: 10 }}>
            <View style={ui.tabs}>
              {categories.map((item) => {
                const active = item === category;
                return (
                  <TouchableOpacity key={item} onPress={() => setCategory(item)} style={[ui.chip, active && ui.chipOn]}>
                    <Text style={[ui.chipText, active && { color: "#fff" }]}>{item}</Text>

                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {loading ? (
            <View style={styles.servicePickerState}><ActivityIndicator color={Colors.primaryText} /></View>
          ) : error ? (
            <View style={styles.servicePickerState}><Text translate style={styles.fieldHintError}>{error}</Text></View>
          ) : (
            // Virtualized: rendering the whole catalog at once made the picker take seconds to open.
            <FlatList
              data={filteredServices}
              extraData={selectedServiceIds}
              initialNumToRender={12}
              keyExtractor={(service) => service.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text translate style={styles.servicePickerEmpty}>No services found.</Text>}
              maxToRenderPerBatch={12}
              removeClippedSubviews
              renderItem={({ item: service, index }) => (
                <PearlCatalogRow first={index === 0} last={index === filteredServices.length - 1} name={service.name} detail={[service.category, formatDurationLabel(service.durationMinutes)].filter(Boolean).join(" \u00b7 ")} price={service.price} selected={selectedServiceIds.includes(service.id)} onPress={() => onSelect(service)} />
              )}
              showsVerticalScrollIndicator={false}
              windowSize={7}
            />
          )}
          </>
          )}
        </View>



        <View style={{ padding: 18, paddingBottom: 12 + insets.bottom }}>
          <TouchableOpacity accessibilityRole="button" disabled={totalSelected === 0} onPress={onContinue} style={totalSelected === 0 ? { opacity: 0.5 } : undefined}>
            <LinearGradient colors={pearlGradients.primary} style={ui.done}><Text style={ui.doneText}>Done {"\u00b7"} {totalSelected} added</Text></LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView></PearlBackground></View></View>
    </Modal>
  );
}

const ui = StyleSheet.create({
 overlay: { flex: 1, backgroundColor: "rgba(35,33,52,0.35)", justifyContent: "flex-end" },
 panel: { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
 handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: pearl.divider, alignSelf: "center", marginTop: 10 },
 header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12 },
 title: { fontSize: 20, fontWeight: "800", color: pearl.ink },
 body: { flex: 1, paddingHorizontal: 18, gap: 10 },
 tabs: { flexDirection: "row", gap: 8 },
 chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder },
 chipOn: { backgroundColor: pearl.accent },
 chipText: { fontSize: 13, fontWeight: "600", color: pearl.accentDeep },
 search: { flexDirection: "row", alignItems: "center", backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder, borderRadius: 16, paddingHorizontal: 14, minHeight: 48 },
 input: { flex: 1, fontSize: 14, color: pearl.ink, paddingVertical: 10 },
 done: { minHeight: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
 doneText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
