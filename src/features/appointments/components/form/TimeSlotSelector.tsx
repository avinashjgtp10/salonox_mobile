import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { getDefaultTimeSlots } from "@/features/appointments/utils/appointmentDateTime";
import { useThemeColors } from "@/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function TimeSlotSelector({
  disabledReason,
  error,
  loading,
  onSelect,
  selectedTime,
  slots,
}: {
  disabledReason?: string | null;
  error?: string;
  loading: boolean;
  onSelect: (time: string) => void;
  selectedTime: string;
  slots: { display: string; value: string }[];
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const anchorRef = useRef<View>(null);
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0, width: 180 });
  const menuHeight = Math.max(44, Math.min(264, menuAnchor.y - insets.top - 12));
  const menuWidth = Math.min(screenWidth - 24, Math.max(180, menuAnchor.width));
  const menuSlots = useMemo(() => {
    const all = new Map<string, { value: string; display: string }>(getDefaultTimeSlots('2000-01-01').map((slot) => [slot.value, slot]));
    slots.forEach((slot) => all.set(slot.value, slot));
    const available = new Set(slots.map((slot) => slot.value));
    return [...all.values()].sort((a, b) => a.value.localeCompare(b.value)).map((slot) => ({ ...slot, available: available.has(slot.value) }));
  }, [slots]);
  const selectedSlot = slots.find((slot) => slot.value === selectedTime);
  const canOpenDropdown = !disabledReason && slots.length > 0 && !loading;

  const handleToggleDropdown = () => {
    if (!canOpenDropdown) {
      return;
    }

    Keyboard.dismiss();
    anchorRef.current?.measureInWindow((x, y, width) => {
      setMenuAnchor({ x, y, width });
      setDropdownOpen(true);
    });
  };

  const handleSelectSlot = (time: string) => {
    onSelect(time);
    setDropdownOpen(false);
  };

  return (
    <View style={styles.inputGroup}>
      <View style={styles.inputLabelRow}>
        <Text style={styles.inputLabel}>Start Time</Text>
        {loading ? <ActivityIndicator color={Colors.primary} size="small" /> : null}
      </View>
      {disabledReason ? <Text style={styles.fieldHint}>{disabledReason}</Text> : null}
      {!disabledReason && slots.length === 0 ? (
        <Text style={styles.fieldHint}>No available slots for this staff member and date.</Text>
      ) : null}
      {slots.length > 0 ? (
        <View ref={anchorRef} collapsable={false} style={styles.timeDropdownWrap}>
          <TouchableOpacity
            activeOpacity={0.84}
            disabled={!canOpenDropdown}
            onPress={handleToggleDropdown}
            style={[
              styles.timeDropdownButton,
              error && styles.inputError,
              !canOpenDropdown && styles.inputDisabled,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.timeDropdownValue, !selectedSlot && styles.timeDropdownPlaceholder]}
            >
              {selectedSlot?.display ?? "Select time"}
            </Text>
            <Ionicons
              name={dropdownOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={Colors.text2}
            />
          </TouchableOpacity>

          {dropdownOpen ? (
            <Modal transparent statusBarTranslucent visible onRequestClose={() => setDropdownOpen(false)}>
              <View style={{ flex: 1 }}>
                <Pressable accessibilityLabel={'Close time list'} accessibilityRole={'button'} style={StyleSheet.absoluteFill} onPress={() => setDropdownOpen(false)} />
                <View style={[styles.timeDropdownMenu, { position: 'absolute', left: Math.max(12, Math.min(menuAnchor.x, screenWidth - menuWidth - 12)), top: Math.max(insets.top + 4, menuAnchor.y - menuHeight - 4), width: menuWidth, maxHeight: menuHeight, marginTop: 0 }]}>
                  <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps={'handled'} nestedScrollEnabled showsVerticalScrollIndicator>
                    {menuSlots.map((slot) => {
                      const selected = slot.value === selectedTime;

                      return (
                        <TouchableOpacity
                          activeOpacity={0.84}
                          key={slot.value}
                          disabled={!slot.available}
                          accessibilityRole={'button'}
                          accessibilityState={{ disabled: !slot.available, selected }}
                          accessibilityLabel={`${slot.display}${slot.available ? '' : ', unavailable'}`}
                          onPress={() => handleSelectSlot(slot.value)}
                          style={[styles.timeDropdownOption, !slot.available && { opacity: 0.4 }, selected && styles.timeDropdownOptionActive]}
                        >
                          <Text style={[styles.timeDropdownOptionText, selected && styles.timeDropdownOptionTextActive]}>
                            {slot.display}
                          </Text>
                          {selected ? <Ionicons name="checkmark-circle" size={18} color={Colors.primary} /> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            </Modal>
          ) : null}
        </View>
      ) : null}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}
