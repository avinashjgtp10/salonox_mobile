import { router, type Href } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { STAFF_MODULE_SECTIONS } from "@/features/staff/constants/staffModule.constants";
import { StaffSectionCard } from "@/features/staff/components/StaffSectionCard";
import { useThemeColors } from "@/theme/ThemeProvider";

type StaffFutureSectionsProps = {
  staffId?: string | null;
};

const INLINE_SECTION_KEYS = new Set(["profile", "address", "emergencyContacts"]);

export function StaffFutureSections({ staffId }: StaffFutureSectionsProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const otherSections = STAFF_MODULE_SECTIONS.filter(
    (section) => !INLINE_SECTION_KEYS.has(section.key),
  );
  const getRoute = (route: string | null) => {
    if (!route) {
      return null;
    }

    return route.replace("[id]", staffId ?? "") as Href;
  };

  return (
    <StaffSectionCard title="Manage Staff">
      <View style={styles.grid}>
        {otherSections.map((section) => (
          <TouchableOpacity
            key={section.key}
            activeOpacity={0.84}
            disabled={!getRoute(section.route)}
            onPress={() => {
              const route = getRoute(section.route);

              if (route) {
                router.push(route);
              }
            }}
            style={styles.item}
          >
            <Text style={styles.itemTitle}>
              {section.label}
              {section.status === "future-ready" ? " (Coming Soon)" : ""}
            </Text>
            <Text style={styles.itemDescription}>{section.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </StaffSectionCard>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  grid: {
    gap: 10,
  },
  item: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 14,
  },
  itemTitle: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  itemDescription: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
    marginTop: Spacing.xs,
  },
});
