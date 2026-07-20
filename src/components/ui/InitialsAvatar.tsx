import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { useThemeColors } from "@/theme/ThemeProvider";

type InitialsAvatarProps = {
  bg?: string;
  color?: string;
  imageUri?: string | null;
  initials: string;
  size?: number;
};

// Shared circular avatar — falls back to initials-on-tint when no image is
// available, matching the pattern already hand-rolled separately in
// DashboardHero, AppointmentCard, ClientCard, and the More screen's hero.
export function InitialsAvatar({
  bg,
  color,
  imageUri,
  initials,
  size = 40,
}: InitialsAvatarProps) {
  const Colors = useThemeColors();
  const resolvedBg = bg ?? Colors.backgroundElement;
  const resolvedColor = color ?? Colors.heading;
  const dimension = { borderRadius: size / 2, height: size, width: size };

  if (imageUri) {
    return <Image contentFit="cover" source={{ uri: imageUri }} style={[styles.image, dimension, { backgroundColor: resolvedBg }]} />;
  }

  return (
    <View style={[styles.circle, dimension, { backgroundColor: resolvedBg, borderColor: Colors.border }]}>
      <Text numberOfLines={1} style={[styles.text, { color: resolvedColor, fontSize: Math.max(10, size * 0.34) }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
  },
  image: {},
  text: {
    fontFamily: "serif",
    fontWeight: "800",
  },
});
