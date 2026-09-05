import { CALENDAR_STATUS_FILTERS } from "@/features/appointments/constants/appointmentConstants";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AppointmentStatus } from "@/types/appointment";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type CalendarStatus = "All" | AppointmentStatus;

export function CalendarStatusFilter({ status, onSelect }: {
  status: CalendarStatus;
  onSelect: (status: CalendarStatus) => void;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  // Keep expansion local so opening the options does not re-render the calendar grid.
  const [expanded, setExpanded] = useState(false);
  const anchorRef = useRef<View>(null);
  const [anchor, setAnchor] = useState({ x: 0, bottom: 0, width: 88 });
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const menuWidth = Math.min(200, width - 24);
  const menuTop = Math.max(insets.top + 4, anchor.bottom + 4);
  const openMenu = () => {
    anchorRef.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      setAnchor({ x, bottom: y + measuredHeight, width: measuredWidth });
      setExpanded(true);
    });
  };
  const selected = CALENDAR_STATUS_FILTERS.find((filter) => filter.status === status);

  return (
    <View ref={anchorRef} collapsable={false} style={localStyles.anchor}>
      <TouchableOpacity
        accessibilityLabel={`Appointment status: ${selected?.label ?? status}`}
        accessibilityHint={expanded ? "Hide status options" : "Show status options"}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        activeOpacity={0.8}
        onPress={openMenu}
        style={[styles.dinggLegendPill, styles.dinggLegendActive]}
      >
        <Text numberOfLines={1} style={[styles.dinggLegendText, styles.dinggLegendTextActive, localStyles.label]}>
          {selected?.label ?? status}
        </Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color="#FFFFFF" />
      </TouchableOpacity>
      {expanded ? (
        <Modal transparent statusBarTranslucent visible onRequestClose={() => setExpanded(false)}>
          <View style={localStyles.overlay}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close status options"
              onPress={() => setExpanded(false)}
              style={StyleSheet.absoluteFill}
            />
            <View style={[localStyles.menu, {
              backgroundColor: Colors.appointmentSurface,
              borderColor: Colors.appointmentDivider,
              left: Math.max(12, Math.min(anchor.x + anchor.width - menuWidth, width - menuWidth - 12)),
              top: menuTop,
              width: menuWidth,
              maxHeight: Math.max(44, Math.min(336, height - menuTop - insets.bottom - 12)),
            }]}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
          {CALENDAR_STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Filter appointments: ${filter.label}`}
              accessibilityState={{ selected: filter.status === status }}
              activeOpacity={0.8}
              key={filter.status}
              onPress={() => {
                setExpanded(false);
                onSelect(filter.status);
              }}
              style={[localStyles.option, filter.status === status && { backgroundColor: Colors.appointmentSurfaceMuted }]}
            >
              {filter.status !== "All" ? <View style={[styles.dinggLegendDot, { backgroundColor: filter.color }]} /> : null}
              <Text style={[styles.dinggLegendText, localStyles.optionLabel]}>{filter.label}</Text>
              {filter.status === status ? <Ionicons name="checkmark" size={18} color={Colors.appointmentAccent} /> : null}
            </TouchableOpacity>
          ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const localStyles = StyleSheet.create({
  anchor: { maxWidth: "45%", flexShrink: 0 },
  label: { flexShrink: 1 },
  overlay: { flex: 1 },
  menu: { position: "absolute", borderRadius: 12, borderWidth: 1, overflow: "hidden", elevation: 8, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  option: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, paddingHorizontal: 14, paddingVertical: 12 },
  optionLabel: { flex: 1 },
});
