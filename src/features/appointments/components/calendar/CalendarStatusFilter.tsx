import { Portal } from "@/components/ui/Portal";
import { CALENDAR_STATUS_FILTERS } from "@/features/appointments/constants/appointmentConstants";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { toggleCalendarStatus } from "@/features/appointments/utils/calendarStatusFilters";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AppointmentStatus } from "@/types/appointment";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function CalendarStatusFilter({ statuses, onChange }: {
  statuses: AppointmentStatus[];
  onChange: (statuses: AppointmentStatus[]) => void;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  // Keep expansion local so opening the options does not re-render the calendar grid.
  const [expanded, setExpanded] = useState(false);
  const anchorRef = useRef<View>(null);
  const overlayRef = useRef<View>(null);
  const [menuLayout, setMenuLayout] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  const insets = useSafeAreaInsets();
  const openMenu = () => {
    setMenuLayout(null);
    setExpanded(true);
  };
  const positionMenu = () => {
    // Both measurements belong to the same native window. Subtract the overlay
    // origin rather than mixing screen coordinates with a native Modal window.
    overlayRef.current?.measureInWindow((overlayX, overlayY, width, height) => {
      anchorRef.current?.measureInWindow((x, y, buttonWidth, buttonHeight) => {
        if (width <= 0 || height <= 0 || buttonHeight <= 0) return;
        const menuWidth = Math.min(200, width - 24);
        const top = y - overlayY + buttonHeight + 4;
        setMenuLayout({
          left: Math.max(12, Math.min(x - overlayX + buttonWidth - menuWidth, width - menuWidth - 12)),
          top,
          width: menuWidth,
          // Keep the menu below the button; scroll the options if space is limited.
          maxHeight: Math.max(0, Math.min(336, height - top - insets.bottom - 12)),
        });
      });
    });
  };
  useEffect(() => {
    if (!expanded) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setExpanded(false);
      return true;
    });
    return () => subscription.remove();
  }, [expanded]);
  const label = statuses.length === 0 ? "All"
    : statuses.length === 1 ? CALENDAR_STATUS_FILTERS.find((filter) => filter.status === statuses[0])?.label ?? statuses[0]
      : `${statuses.length} selected`;

  return (
    <View ref={anchorRef} collapsable={false} style={localStyles.anchor}>
      <TouchableOpacity
        accessibilityLabel={`Appointment statuses: ${label}`}
        accessibilityHint={expanded ? "Hide status options" : "Show status options"}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        activeOpacity={0.8}
        onPress={openMenu}
        style={[styles.dinggLegendPill, styles.dinggLegendActive]}
      >
        <Text numberOfLines={1} style={[styles.dinggLegendText, styles.dinggLegendTextActive, localStyles.label]}>
          {label}
        </Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color="#FFFFFF" />
      </TouchableOpacity>
      {expanded ? (
        <Portal>
          <View ref={overlayRef} collapsable={false} onLayout={positionMenu} style={localStyles.overlay}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close status options"
              onPress={() => setExpanded(false)}
              style={StyleSheet.absoluteFill}
            />
            {menuLayout ? <View accessibilityViewIsModal style={[localStyles.menu, menuLayout, {
              backgroundColor: Colors.appointmentSurface,
              borderColor: Colors.appointmentDivider,
            }]}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator style={localStyles.options}>
          {CALENDAR_STATUS_FILTERS.map((filter) => {
            const selected = filter.status === "All" ? statuses.length === 0 : statuses.includes(filter.status);
            return (
            <TouchableOpacity
              accessibilityRole="checkbox"
              accessibilityLabel={`Filter appointments: ${filter.label}`}
              accessibilityState={{ checked: selected }}
              activeOpacity={0.8}
              key={filter.status}
              onPress={() => onChange(toggleCalendarStatus(statuses, filter.status))}
              style={[localStyles.option, selected && { backgroundColor: Colors.appointmentSurfaceMuted }]}
            >
              {filter.status !== "All" ? <View style={[styles.dinggLegendDot, { backgroundColor: filter.color }]} /> : null}
              <Text style={[styles.dinggLegendText, localStyles.optionLabel]}>{filter.label}</Text>
              <Ionicons name={selected ? "checkbox" : "square-outline"} size={18} color={selected ? Colors.appointmentAccent : Colors.appointmentTextSecondary} />
            </TouchableOpacity>
          ); })}
              </ScrollView>
              <TouchableOpacity accessibilityRole="button" onPress={() => setExpanded(false)} style={[localStyles.done, { borderTopColor: Colors.appointmentDivider }]}>
                <Text style={[styles.dinggLegendText, { color: Colors.appointmentAccent }]}>Done</Text>
              </TouchableOpacity>
            </View> : null}
          </View>
        </Portal>
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
  options: { flexShrink: 1 },
  done: { minHeight: 44, alignItems: "center", justifyContent: "center", borderTopWidth: 1, flexShrink: 0 },
});
