import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import type { StaffMember } from "@/data/teamData";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { formatCurrency, formatDurationLabel } from "@/features/appointments/utils/appointmentForm";
import { staffIdMatches } from "@/features/appointments/utils/staffAssignment";
import type { AppointmentItemKind, AppointmentSelectedService } from "@/features/appointments/types/appointmentForm";
import { MembershipCatalogTab } from "@/features/quickSale/components/MembershipCatalogTab";
import { PackageCatalogTab } from "@/features/quickSale/components/PackageCatalogTab";
import { ProductCatalogTab } from "@/features/quickSale/components/ProductCatalogTab";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ClientPackage } from "@/types/package";
import type { ServiceListItem } from "@/types/service";
import { Ionicons } from "@expo/vector-icons";
import { memo, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const NO_CLIENT_PACKAGES: ClientPackage[] = [];

const CatalogServiceRow = memo(function CatalogServiceRow({
  onSelect,
  selected,
  service,
  styles,
}: {
  onSelect: (service: ServiceListItem) => void;
  selected: boolean;
  service: ServiceListItem;
  styles: ReturnType<typeof createStyles>;
}) {
  const Colors = useThemeColors();

  return (
    <View style={styles.catalogServiceRow}>
      <View style={styles.catalogServiceCopy}>
        <Text style={styles.catalogServiceName}>{service.name}</Text>
        <Text style={styles.catalogServiceMeta}>
          {formatCurrency(service.price)} <Text style={styles.catalogServiceDivider}>|</Text> {formatDurationLabel(service.durationMinutes)}
        </Text>
      </View>
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => onSelect(service)}
        style={[styles.catalogAddButton, selected && styles.catalogQuantityButton]}
      >
        {selected ? (
          <><Ionicons name="remove" size={18} color={Colors.appointmentText} /><Text style={styles.catalogQuantityText}>1</Text><Ionicons name="add" size={18} color={Colors.appointmentMuted} /></>
        ) : (
          <><Text style={styles.catalogAddText}>Add</Text><Ionicons name="add" size={18} color={Colors.appointmentText} /></>
        )}
      </TouchableOpacity>
    </View>
  );
});

type PickerTab = "service" | AppointmentItemKind;

const PICKER_TABS: { key: PickerTab; label: string; noun: string }[] = [
  { key: "service", label: "Services", noun: "services" },
  { key: "product", label: "Products", noun: "products" },
  { key: "membership", label: "Memberships", noun: "memberships" },
  { key: "package", label: "Packages", noun: "packages" },
];

export function ServiceCatalogPicker({
  clientId,
  error,
  loading,
  onClose,
  onContinue,
  onSelect,
  onSelectStaff,
  onToggleItem,
  salonId,
  selectedItems,
  selectedStaffId,
  selectedServiceIds,
  staffError,
  staffMembers,
  services,
  visible,
}: {
  clientId?: string | null;
  error: string | null;
  loading: boolean;
  onClose: () => void;
  onContinue: () => void;
  onSelect: (service: ServiceListItem) => void;
  onSelectStaff: (staffId: string) => void;
  onToggleItem: (kind: AppointmentItemKind, item: { categoryId?: string | null; id: string; name: string; price: number }) => void;
  salonId?: string | null;
  selectedItems: AppointmentSelectedService[];
  selectedStaffId: string;
  selectedServiceIds: string[];
  staffError?: string;
  staffMembers: StaffMember[];
  services: ServiceListItem[];
  visible: boolean;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<PickerTab>("service");
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const activeTab = PICKER_TABS.find((item) => item.key === tab) ?? PICKER_TABS[0];
  const addedForTab = tab === "service" ? [] : selectedItems.filter((item) => item.itemKind === tab);
  const totalSelected = selectedServiceIds.length + selectedItems.length;
  const [staffPickerOpen, setStaffPickerOpen] = useState(false);
  const selectedStaff = staffMembers.find((staff) => staffIdMatches(staff, selectedStaffId));
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
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <SafeAreaView edges={["top"]} style={styles.servicePickerSafeArea}>
        <AppStatusBar />
        <View style={styles.servicePickerHeader}>
          <AppBackButton onPress={onClose} />
          <Text style={styles.servicePickerTitle}>Add services & items</Text>
        </View>

        <View style={styles.servicePickerBody}>
          <TouchableOpacity
            accessibilityLabel="Assigned Staff"
            activeOpacity={0.84}
            onPress={() => setStaffPickerOpen(true)}
            style={[styles.servicePickerSelect, staffError && styles.inputError]}
          >
            {selectedStaff ? (
              <View style={styles.servicePickerSelectCopy}>
                <Text style={styles.servicePickerSelectCaption}>Assigned Staff</Text>
                <Text numberOfLines={1} style={styles.servicePickerSelectText}>{selectedStaff.name}</Text>
              </View>
            ) : (
              <Text style={[styles.servicePickerSelectText, styles.servicePickerSelectPlaceholder]}>Assigned Staff*</Text>
            )}
            <Ionicons name="chevron-down" size={18} color={Colors.appointmentTextSecondary} />
          </TouchableOpacity>
          {staffError ? <Text style={styles.fieldError}>{staffError}</Text> : null}

          <Text style={[styles.servicePickerLabel, styles.servicePickerSectionLabel]}>Services & items</Text>
          <View style={styles.itemKindTabRow}>
            {PICKER_TABS.map((item) => {
              const active = item.key === tab;
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.84}
                  onPress={() => setTab(item.key)}
                  style={[styles.itemKindTab, active && styles.itemKindTabActive]}
                >
                  <Text numberOfLines={1} style={[styles.itemKindTabText, active && styles.itemKindTabTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.servicePickerSearch}>
            <TextInput
              autoCorrect={false}
              onChangeText={setQuery}
              placeholder={`Search for ${activeTab.noun}`}
              placeholderTextColor={Colors.appointmentPlaceholder}
              style={styles.servicePickerSearchInput}
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
              {addedForTab.length > 0 ? (
                <View style={styles.addedItemsRow}>
                  {addedForTab.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      accessibilityLabel={`Remove ${item.name}`}
                      activeOpacity={0.84}
                      onPress={() => onToggleItem(tab, { id: item.catalogServiceId ?? item.id, name: item.name, price: item.price })}
                      style={styles.addedItemChip}
                    >
                      <Ionicons name="checkmark-circle" size={16} color={Colors.primaryText} />
                      <Text numberOfLines={1} style={styles.addedItemChipText}>{item.name}</Text>
                      <Ionicons name="close" size={16} color={Colors.appointmentMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
              <View style={styles.catalogTabBody}>
                {tab === "product" ? (
                  <ProductCatalogTab
                    onSelect={(product) => onToggleItem("product", { categoryId: product.categoryId, id: product.id, name: product.name, price: product.price })}
                    search={query}
                  />
                ) : tab === "membership" ? (
                  <MembershipCatalogTab
                    clientId={clientId}
                    onSelect={(membership) => onToggleItem("membership", { id: membership.id, name: membership.name, price: membership.price })}
                    salonId={salonId}
                    search={query}
                  />
                ) : (
                  <PackageCatalogTab
                    activeClientPackages={NO_CLIENT_PACKAGES}
                    onSelect={(pkg) => onToggleItem("package", { id: pkg.id, name: pkg.name, price: pkg.basePrice })}
                    salonId={salonId}
                    search={query}
                  />
                )}
              </View>
            </>
          ) : (
          <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serviceCategoryScroll}>
            <View style={styles.serviceCategoryRow}>
              {categories.map((item) => {
                const active = item === category;
                return (
                  <TouchableOpacity key={item} onPress={() => setCategory(item)} style={styles.serviceCategoryTab}>
                    <Text style={[styles.serviceCategoryText, active && styles.serviceCategoryTextActive]}>{item}</Text>
                    {active ? <View style={styles.serviceCategoryIndicator} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {loading ? (
            <View style={styles.servicePickerState}><ActivityIndicator color={Colors.primaryText} /></View>
          ) : error ? (
            <View style={styles.servicePickerState}><Text style={styles.fieldHintError}>{error}</Text></View>
          ) : (
            // Virtualized: rendering the whole catalog at once made the picker take seconds to open.
            <FlatList
              data={filteredServices}
              extraData={selectedServiceIds}
              initialNumToRender={12}
              keyExtractor={(service) => service.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.servicePickerEmpty}>No services found.</Text>}
              maxToRenderPerBatch={12}
              removeClippedSubviews
              renderItem={({ item: service }) => (
                <CatalogServiceRow
                  onSelect={onSelect}
                  selected={selectedServiceIds.includes(service.id)}
                  service={service}
                  styles={styles}
                />
              )}
              showsVerticalScrollIndicator={false}
              windowSize={7}
            />
          )}
          </>
          )}
        </View>

        <Modal animationType="fade" onRequestClose={() => setStaffPickerOpen(false)} transparent visible={staffPickerOpen}>
          <Pressable onPress={() => setStaffPickerOpen(false)} style={styles.stylistModalBackdrop}>
            <Pressable style={styles.stylistModalCard}>
              <View style={styles.stylistModalHeader}>
                <Text style={styles.stylistModalTitle}>Assigned Staff</Text>
                <TouchableOpacity onPress={() => setStaffPickerOpen(false)}><Ionicons name="close" size={26} color={Colors.appointmentMuted} /></TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => { onSelectStaff(""); setStaffPickerOpen(false); }} style={styles.stylistOptionRow}>
                <Text style={styles.stylistOptionName}>No Preferences</Text>
              </TouchableOpacity>
              <ScrollView showsVerticalScrollIndicator={false}>
                {staffMembers.map((staff) => (
                  <TouchableOpacity key={staff.id} onPress={() => { onSelectStaff(staff.id); setStaffPickerOpen(false); }} style={styles.stylistOptionRow}>
                    <InitialsAvatar initials={staff.initials} size={36} />
                    <Text numberOfLines={1} style={styles.stylistOptionName}>{staff.name}</Text>
                    <Text style={styles.stylistAvailability}>{staff.availabilityLabel || "Available"}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Footer owns the bottom inset so its surface runs under the nav bar. */}
        <View style={[styles.servicePickerFooter, { paddingBottom: 10 + insets.bottom }]}>
          <Text style={styles.servicePickerCount}>{totalSelected} {totalSelected === 1 ? "Item" : "Items"}</Text>
          <TouchableOpacity
            disabled={totalSelected === 0}
            onPress={onContinue}
            style={[styles.servicePickerContinue, totalSelected === 0 && styles.disabledButton]}
          >
            <Text style={styles.servicePickerContinueText}>Continue</Text>
            <Ionicons name="arrow-forward" size={22} color={Colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
