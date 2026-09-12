import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import type { StaffMember } from "@/data/teamData";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { formatCurrency, formatDurationLabel } from "@/features/appointments/utils/appointmentForm";
import { staffIdMatches } from "@/features/appointments/utils/staffAssignment";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ServiceListItem } from "@/types/service";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function ServiceCatalogPicker({
  error,
  loading,
  onClose,
  onContinue,
  onSelect,
  onSelectStaff,
  selectedStaffId,
  selectedServiceIds,
  staffError,
  staffMembers,
  services,
  visible,
}: {
  error: string | null;
  loading: boolean;
  onClose: () => void;
  onContinue: () => void;
  onSelect: (service: ServiceListItem) => void;
  onSelectStaff: (staffId: string) => void;
  selectedStaffId: string;
  selectedServiceIds: string[];
  staffError?: string;
  staffMembers: StaffMember[];
  services: ServiceListItem[];
  visible: boolean;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
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
      <SafeAreaView edges={["top", "bottom"]} style={styles.servicePickerSafeArea}>
        <AppStatusBar />
        <View style={styles.servicePickerHeader}>
          <AppBackButton onPress={onClose} />
          <Text style={styles.servicePickerTitle}>Add services</Text>
        </View>

        <View style={styles.servicePickerBody}>
          <Text style={styles.servicePickerLabel}>Assigned Staff*</Text>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => setStaffPickerOpen(true)}
            style={[styles.servicePickerSelect, staffError && styles.inputError]}
          >
            <Text style={[styles.servicePickerSelectText, !selectedStaff && styles.servicePickerSelectPlaceholder]}>{selectedStaff?.name ?? "-"}</Text>
            <Ionicons name="chevron-down" size={18} color={Colors.appointmentTextSecondary} />
          </TouchableOpacity>
          {staffError ? <Text style={styles.fieldError}>{staffError}</Text> : null}

          <Text style={styles.servicePickerLabel}>Services</Text>
          <View style={styles.servicePickerSearch}>
            <TextInput
              autoCorrect={false}
              onChangeText={setQuery}
              placeholder="Search for services"
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
            <View style={styles.servicePickerState}><ActivityIndicator color={Colors.appointmentAccent} /></View>
          ) : error ? (
            <View style={styles.servicePickerState}><Text style={styles.fieldHintError}>{error}</Text></View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {filteredServices.map((service) => {
                const selected = selectedServiceIds.includes(service.id);
                return (
                  <View key={service.id} style={styles.catalogServiceRow}>
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
              })}
              {filteredServices.length === 0 ? <Text style={styles.servicePickerEmpty}>No services found.</Text> : null}
            </ScrollView>
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

        <View style={styles.servicePickerFooter}>
          <Text style={styles.servicePickerCount}>{selectedServiceIds.length} {selectedServiceIds.length === 1 ? "Service" : "Services"}</Text>
          <TouchableOpacity
            disabled={selectedServiceIds.length === 0}
            onPress={onContinue}
            style={[styles.servicePickerContinue, selectedServiceIds.length === 0 && styles.disabledButton]}
          >
            <Text style={styles.servicePickerContinueText}>Continue</Text>
            <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
