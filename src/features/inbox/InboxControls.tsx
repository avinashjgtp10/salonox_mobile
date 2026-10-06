import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { TouchableOpacity, View } from "react-native";
import { inboxAvatar } from "@/utils/inboxPresentation";
import { useInboxTheme } from "./inboxTheme";

export function InboxIcon({ name, label, onPress, disabled = false }: {
  name: ComponentProps<typeof Ionicons>["name"]; label: string; onPress: () => void; disabled?: boolean;
}) {
  const { styles: s, palette: p } = useInboxTheme();
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[s.icon, disabled && { opacity: 0.4 }]}><Ionicons name={name} size={22} color={p.muted} /></TouchableOpacity>;
}

export function InboxAvatar({ name, phone }: { name?: string | null; phone: string }) {
  const { styles: s, palette: p } = useInboxTheme();
  const avatar = inboxAvatar(name, phone);
  return <View style={[s.avatar, { backgroundColor: p.accent }]}><Text style={s.avatarText}>{avatar.initials}</Text></View>;
}
