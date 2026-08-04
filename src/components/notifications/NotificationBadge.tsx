import { useMemo } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

type NotificationBadgeProps = {
  count: number;
  maxDisplayCount?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export const formatUnreadCount = (count: number, maxDisplayCount = 99): string => {
  if (count <= 0) {
    return "";
  }

  if (count > maxDisplayCount) {
    return `${maxDisplayCount}+`;
  }

  return String(count);
};

export function NotificationBadge({
  count,
  maxDisplayCount = 99,
  style,
  textStyle,
}: NotificationBadgeProps) {
  const displayCount = useMemo(
    () => formatUnreadCount(count, maxDisplayCount),
    [count, maxDisplayCount],
  );

  if (count <= 0 || !displayCount) {
    return null;
  }

  const isMultiChar = displayCount.length > 1;

  return (
    <View
      style={[
        styles.badge,
        isMultiChar ? styles.pillBadge : styles.circleBadge,
        style,
      ]}
    >
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        numberOfLines={1}
        style={[styles.text, textStyle]}
      >
        {displayCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: "#FF3B30",
    borderColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1.5,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    top: 12,
    zIndex: 10,
  },
  circleBadge: {
    minWidth: 20,
    paddingHorizontal: 0,
    width: 20,
  },
  pillBadge: {
    minWidth: 20,
    paddingHorizontal: 5,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    includeFontPadding: false,
    textAlign: "center",
    textAlignVertical: "center",
  },
});
