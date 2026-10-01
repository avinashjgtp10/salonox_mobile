import { Text, TextInput } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { memo, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { PosStaffMember } from "@/types/sales";

type StaffSectionProps = {
  /** Embedded (calendar modal) mode shows a compact dropdown that opens `onOpenPicker`. */
  embedded: boolean;
  isLoading: boolean;
  onOpenPicker: () => void;
  onSelect: (staffMember: PosStaffMember) => void;
  selectedStaff: PosStaffMember | null;
  staff: PosStaffMember[];
};

function StaffSectionComponent({
  embedded,
  isLoading,
  onOpenPicker,
  onSelect,
  selectedStaff,
  staff,
}: StaffSectionProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [searchQuery, setSearchQuery] = useState("");
  const trimmedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredStaff = useMemo(
    () =>
      trimmedSearchQuery
        ? staff.filter((staffMember) =>
            [staffMember.name, staffMember.role, staffMember.status]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(trimmedSearchQuery)),
          )
        : staff,
    [staff, trimmedSearchQuery],
  );

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>3. Select Staff</Text>
          {selectedStaff ? (
            <Text numberOfLines={1} style={styles.selectedSummary}>
              {selectedStaff.name}
            </Text>
          ) : null}
        </View>
      </View>

      {embedded ? (
        <TouchableOpacity
          accessibilityLabel="Select staff"
          activeOpacity={0.84}
          onPress={onOpenPicker}
          style={styles.dropdown}
        >
          <Ionicons color={Colors.text2} name="people-outline" size={17} />
          <Text numberOfLines={1} style={[styles.dropdownText, selectedStaff && styles.dropdownTextSelected]}>
            {selectedStaff?.name ?? "Select Staff"}
          </Text>
          <Ionicons color={Colors.text2} name="chevron-down" size={17} />
        </TouchableOpacity>
      ) : (
        <>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color={Colors.text2} />
            <TextInput
              autoCapitalize="none"
              onChangeText={setSearchQuery}
              placeholder="Search staff"
              placeholderTextColor={Colors.placeholder}
              returnKeyType="search"
              style={styles.searchInput}
              value={searchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity
                accessibilityLabel="Clear staff search"
                activeOpacity={0.74}
                onPress={() => setSearchQuery("")}
              >
                <Ionicons name="close-circle" size={16} color={Colors.text2} />
              </TouchableOpacity>
            ) : null}
          </View>

          {isLoading && staff.length === 0 ? (
            <View style={styles.stateBlock}>
              <ActivityIndicator color={Colors.primary} size="small" />
              <Text style={styles.stateText}>Loading staff...</Text>
            </View>
          ) : filteredStaff.length === 0 ? (
            <View style={styles.stateBlock}>
              <Text style={styles.stateTitle}>
                {trimmedSearchQuery ? "No matching staff" : "No staff members found."}
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              keyboardShouldPersistTaps="handled"
              showsHorizontalScrollIndicator={false}
              style={styles.list}
            >
              {filteredStaff.map((staffMember) => {
                const isSelected = selectedStaff?.id === staffMember.id;

                return (
                  <TouchableOpacity
                    accessibilityLabel={`Select staff ${staffMember.name}`}
                    accessibilityRole="button"
                    activeOpacity={0.84}
                    key={`quick-sale-staff-${staffMember.id}`}
                    onPress={() => onSelect(staffMember)}
                    style={[styles.card, isSelected && styles.cardSelected]}
                  >
                    <View style={[styles.avatar, { backgroundColor: staffMember.avatarBg }]}>
                      <Text style={[styles.avatarText, { color: staffMember.avatarColor }]}>
                        {staffMember.initials}
                      </Text>
                    </View>
                    <Text numberOfLines={1} style={styles.name}>
                      {staffMember.name}
                    </Text>
                    <Text numberOfLines={1} style={styles.role}>
                      {staffMember.role ?? staffMember.status}
                    </Text>
                    {isSelected ? (
                      <View style={styles.selectedIcon}>
                        <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

export const StaffSection = memo(StaffSectionComponent);

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  section: {
    gap: Spacing.sm,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: Spacing.md,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "900",
  },
  selectedSummary: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
    maxWidth: 240,
  },
  dropdown: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  dropdownText: {
    color: Colors.placeholder,
    flex: 1,
    fontSize: 13,
  },
  dropdownTextSelected: {
    color: Colors.heading,
    fontWeight: "800",
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 46,
    paddingHorizontal: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.035,
    shadowRadius: 14,
    elevation: 1,
  },
  searchInput: {
    color: Colors.heading,
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  list: {
    marginHorizontal: -AppLayout.contentHorizontalPadding,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  card: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginRight: Spacing.sm,
    minHeight: 120,
    padding: Spacing.md,
    position: "relative",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    width: 136,
    elevation: 1,
  },
  cardSelected: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  avatar: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 46,
    justifyContent: "center",
    marginBottom: Spacing.sm,
    width: 46,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "900",
  },
  name: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    width: "100%",
  },
  role: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
    textAlign: "center",
    width: "100%",
  },
  selectedIcon: {
    position: "absolute",
    right: 8,
    top: 8,
  },
  stateBlock: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    gap: 6,
    justifyContent: "center",
    minHeight: 92,
    padding: Spacing.lg,
  },
  stateTitle: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  stateText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
