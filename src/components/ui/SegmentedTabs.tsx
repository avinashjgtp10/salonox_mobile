import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { DashboardRadius as Radius, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

export type SegmentedTabOption<TKey extends string> = {
  disabled?: boolean;
  key: TKey;
  label: string;
};

type SegmentedTabsProps<TKey extends string> = {
  activeKey: TKey;
  onChange: (key: TKey) => void;
  segments: SegmentedTabOption<TKey>[];
  // Rendered inline after a disabled segment's label (e.g. a small "Soon"
  // badge) — kept generic rather than baking in one specific badge shape.
  renderDisabledAdornment?: (segment: SegmentedTabOption<TKey>) => React.ReactNode;
};

// Generalized version of Quick Sale's existing Services/Products/Bill tab
// row — same pill-track visual, now reusable by any screen (Notifications'
// All/Unread control, Quick Sale's own tab row).
export function SegmentedTabs<TKey extends string>({
  activeKey,
  onChange,
  segments,
  renderDisabledAdornment,
}: SegmentedTabsProps<TKey>) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.track}>
      {segments.map((segment) => {
        const isActive = segment.key === activeKey;

        return (
          <TouchableOpacity
            key={segment.key}
            activeOpacity={segment.disabled ? 1 : 0.84}
            disabled={segment.disabled}
            onPress={() => onChange(segment.key)}
            style={[styles.segment, isActive && styles.segmentActive, segment.disabled && styles.segmentDisabled]}
          >
            <Text
              numberOfLines={1}
              style={[styles.label, isActive && styles.labelActive, segment.disabled && styles.labelDisabled]}
            >
              {segment.label}
            </Text>
            {segment.disabled && renderDisabledAdornment ? renderDisabledAdornment(segment) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  track: {
    backgroundColor: Colors.backgroundElement,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.full,
    flexDirection: "row",
    padding: 4,
  },
  segment: {
    alignItems: "center",
    borderRadius: Radius.full,
    flex: 1,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 6,
    paddingVertical: 9,
  },
  segmentActive: {
    backgroundColor: Colors.card,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  segmentDisabled: {
    opacity: 0.55,
  },
  label: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
  },
  labelActive: {
    color: Colors.heading,
  },
  labelDisabled: {
    color: Colors.text2,
  },
});
