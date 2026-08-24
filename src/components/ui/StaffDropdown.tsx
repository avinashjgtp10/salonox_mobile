import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import type { StaffMember } from "@/data/teamData";
import { useThemeColors } from "@/theme/ThemeProvider";

type StaffDropdownProps = {
  error?: string;
  label?: string;
  onSelect: (staffId: string) => void;
  placeholder?: string;
  selectedStaffId: string;
  staffMembers: StaffMember[];
};

const matchesStaffId = (staff: StaffMember, staffId: string) =>
  staff.id === staffId || staff.userId === staffId || staff.staffIdAliases?.includes(staffId) === true;

export function StaffDropdown({
  error,
  label,
  onSelect,
  placeholder = "Select staff member",
  selectedStaffId,
  staffMembers,
}: StaffDropdownProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedStaff = staffMembers.find((staff) => matchesStaffId(staff, selectedStaffId));
  const filteredStaff = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return staffMembers;

    return staffMembers.filter((staff) =>
      [staff.name, staff.role, staff.availabilityLabel, staff.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
    );
  }, [query, staffMembers]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        accessibilityLabel={label ?? placeholder}
        activeOpacity={0.84}
        onPress={() => setOpen(true)}
        style={[styles.trigger, error && styles.triggerError]}
      >
        {selectedStaff ? <InitialsAvatar initials={selectedStaff.initials} size={36} /> : null}
        <View style={styles.triggerCopy}>
          <Text numberOfLines={1} style={[styles.triggerText, !selectedStaff && styles.placeholder]}>
            {selectedStaff?.name ?? placeholder}
          </Text>
          {selectedStaff ? (
            <Text numberOfLines={1} style={styles.triggerMeta}>
              {[selectedStaff.role, selectedStaff.availabilityLabel].filter(Boolean).join(" | ")}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-down" size={18} color={Colors.appointmentTextSecondary} />
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal animationType="fade" onRequestClose={close} transparent visible={open}>
        <Pressable onPress={close} style={styles.backdrop}>
          <Pressable onPress={(event) => event.stopPropagation()} style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label ?? "Select Staff Member"}</Text>
              <TouchableOpacity accessibilityLabel="Close staff list" onPress={close} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={Colors.appointmentText} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={20} color={Colors.appointmentTextSecondary} />
              <TextInput
                autoCorrect={false}
                onChangeText={setQuery}
                placeholder="Search by staff name"
                placeholderTextColor={Colors.appointmentPlaceholder}
                style={styles.searchInput}
                value={query}
              />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {filteredStaff.map((staff) => {
                const selected = matchesStaffId(staff, selectedStaffId);
                return (
                  <TouchableOpacity
                    key={staff.id}
                    activeOpacity={0.82}
                    onPress={() => {
                      onSelect(staff.id);
                      close();
                    }}
                    style={[styles.option, selected && styles.optionSelected]}
                  >
                    <InitialsAvatar initials={staff.initials} size={38} />
                    <View style={styles.optionCopy}>
                      <Text numberOfLines={1} style={styles.optionName}>{staff.name}</Text>
                      <Text numberOfLines={1} style={styles.optionMeta}>
                        {[staff.role, staff.availabilityLabel ?? staff.status].filter(Boolean).join(" | ")}
                      </Text>
                    </View>
                    {selected ? <Ionicons name="checkmark-circle" size={22} color={Colors.appointmentAccent} /> : null}
                  </TouchableOpacity>
                );
              })}
              {filteredStaff.length === 0 ? <Text style={styles.empty}>No staff found.</Text> : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (Colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(20, 18, 19, 0.48)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  closeButton: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  empty: { color: Colors.appointmentTextSecondary, paddingVertical: 24, textAlign: "center" },
  error: { color: Colors.error, fontSize: 12, marginTop: 6 },
  label: { color: Colors.appointmentText, fontSize: 13, fontWeight: "600", marginBottom: 6 },
  option: {
    alignItems: "center",
    borderBottomColor: Colors.appointmentDivider,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    minHeight: 62,
    paddingHorizontal: 4,
  },
  optionCopy: { flex: 1, minWidth: 0 },
  optionMeta: { color: Colors.appointmentTextSecondary, fontSize: 12, marginTop: 2 },
  optionName: { color: Colors.appointmentText, fontSize: 14, fontWeight: "700" },
  optionSelected: { backgroundColor: Colors.appointmentAccentSoft },
  placeholder: { color: Colors.appointmentPlaceholder, fontWeight: "500" },
  searchInput: { color: Colors.appointmentText, flex: 1, fontSize: 14, minHeight: 48 },
  searchWrap: {
    alignItems: "center",
    borderColor: Colors.appointmentBorder,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  sheet: { backgroundColor: Colors.appointmentSurface, borderRadius: 8, maxHeight: "68%", padding: 16 },
  sheetHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  sheetTitle: { color: Colors.appointmentText, fontSize: 18, fontWeight: "700" },
  trigger: {
    alignItems: "center",
    backgroundColor: Colors.appointmentSurface,
    borderColor: Colors.appointmentBorder,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 12,
  },
  triggerCopy: { flex: 1, minWidth: 0 },
  triggerError: { borderColor: Colors.error },
  triggerMeta: { color: Colors.appointmentTextSecondary, fontSize: 11, marginTop: 2 },
  triggerText: { color: Colors.appointmentText, fontSize: 14, fontWeight: "700" },
});
