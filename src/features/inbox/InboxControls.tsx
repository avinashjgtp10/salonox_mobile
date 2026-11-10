import { AppBackButton } from "@/components/ui/AppBackButton";
import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { TouchableOpacity } from "react-native";
import { inboxAvatar } from "@/utils/inboxPresentation";
import { useInboxTheme } from "./inboxTheme";
import { pearlTones } from "@/components/auth/pearl/tokens";
import { LinearGradient } from "expo-linear-gradient";

export function InboxIcon({
  name,
  label,
  onPress,
  disabled = false,
}: {
  name: ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { styles: s, palette: p } = useInboxTheme();
  if (name === "arrow-back")
    return (
      <AppBackButton
        onPress={onPress}
        accessibilityLabel={label}
        disabled={disabled}
      />
    );
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[s.icon, disabled && { opacity: 0.4 }]}
    >
      <Ionicons name={name} size={22} color={p.muted} />
    </TouchableOpacity>
  );
}

export function InboxAvatar({
  name,
  phone,
}: {
  name?: string | null;
  phone: string;
}) {
  const { styles: s } = useInboxTheme();
  const avatar = inboxAvatar(name, phone);
  const tone = [pearlTones.rose, pearlTones.peach, pearlTones.lilac][
    [...phone].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 3
  ];
  return (
    <LinearGradient colors={tone.avatar} style={s.avatar}>
      <Text style={s.avatarText}>{avatar.initials}</Text>
    </LinearGradient>
  );
}
