import { AppBackButton } from "@/components/ui/AppBackButton";
/** Shared pearl UI pieces (from the prototype) used across the main app screens. */
import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode } from "react";
import { Pressable, type PressableProps, StyleSheet, View, type ViewStyle } from "react-native";

import { pearl, pearlGradients, pearlShadow, pearlType, pearlTones, type PearlTone } from "@/components/auth/pearl/tokens";
import { Text } from "@/components/ui/AppTypography";
import { Icon, type IconName } from "./Icon";

export function IconButton({ icon, onPress, label, badge, size = 42, style }: {
  icon: IconName; onPress?: () => void; label: string; badge?: number; size?: number; style?: ViewStyle;
}) {
  if (icon === "chevronLeft") return <AppBackButton onPress={onPress} accessibilityLabel={label} style={style} />;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={badge ? `${label}, ${badge} new` : label} hitSlop={6}
      style={({ pressed }) => [styles.iconBtn, { width: size, height: size }, pressed && styles.pressed, style]}>
      <Icon name={icon} size={20} color={pearl.ink} />
      {badge ? <View style={styles.badge}><Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text></View> : null}
    </Pressable>
  );
}

export function Tile({ icon, tone = "lavender", size = 40 }: { icon: IconName; tone?: PearlTone; size?: number }) {
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.32, backgroundColor: pearlTones[tone].bg }]}>
      <Icon name={icon} size={18} color={pearlTones[tone].fg} />
    </View>
  );
}

export function Avatar({ initials, tone = "lavender", size = 34 }: { initials: string; tone?: PearlTone; size?: number }) {
  return (
    <LinearGradient colors={pearlTones[tone].avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontWeight: "800", color: "#fff", fontSize: size * 0.34 }}>{initials}</Text>
    </LinearGradient>
  );
}

export type PillTone = "success" | "warning" | "danger" | "neutral";
export function StatusPill({ tone, label }: { tone: PillTone; label: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: pearlTones[tone].bg }]} accessibilityLabel={label}>
      <View style={[styles.pillDot, { backgroundColor: pearlTones[tone].fg }]} />
      <Text translate style={[styles.pillText, { color: pearlTones[tone].fg }]}>{label}</Text>
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.secH}>
      <Text translate style={[pearlType.bodyStrong, { fontSize: 15, fontWeight: "800" }]} accessibilityRole="header">{title}</Text>
      {action ? <Pressable onPress={onAction} disabled={!onAction} hitSlop={8} accessibilityRole={onAction ? "link" : "text"}><Text style={pearlType.link}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function Card({ children, style, padded }: { children: ReactNode; style?: ViewStyle; padded?: boolean }) {
  return <View style={[styles.card, padded && { padding: 16 }, style]}>{children}</View>;
}

export function ListRow({ left, title, subtitle, right, onPress, label, chevron }: {
  left?: ReactNode; title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; label?: string; chevron?: boolean;
}) {
  const body = (
    <>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text translate style={pearlType.bodyStrong} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text translate style={[pearlType.small, { marginTop: 2 }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
      {chevron ? <Icon name="chevronRight" size={16} color={pearl.muted} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label ?? title}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: "rgba(255,255,255,0.5)" }]}>{body}</Pressable>
  );
}

export const Divider = ({ inset = 14 }: { inset?: number }) => <View style={[styles.divider, { marginLeft: inset }]} />;

export function StatTile({ icon, tone, label, value, sub, onPress, style, loading }: {
  icon?: IconName; tone?: PearlTone; label: string; value: string; sub?: string; onPress?: () => void; style?: ViewStyle; loading?: boolean;
}) {
  const inner = (
    <>
      {icon ? (
        <View style={styles.statTop}>
          <Tile icon={icon} tone={tone} size={34} />
          {onPress ? <Icon name="chevronRight" size={14} color={pearl.muted} /> : null}
        </View>
      ) : null}
      <Text translate style={[pearlType.small, { fontSize: 12, fontWeight: "600" }]} numberOfLines={1}>{label}</Text>
      {loading
        ? <Skeleton h={20} r={8} style={{ marginTop: 4, width: "70%" }} />
        : <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>}
      {sub ? <Text style={[pearlType.small, { fontSize: 11 }]}>{sub}</Text> : null}
    </>
  );
  return onPress
    ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label} ${value}`} style={({ pressed }) => [styles.stat, pressed && styles.pressed, style]}>{inner}</Pressable>
    : <View style={[styles.stat, style]}>{inner}</View>;
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Tile icon={icon} tone="lilac" size={52} />
      <Text translate style={[pearlType.bodyStrong, { textAlign: "center" }]}>{title}</Text>
      <Text style={[pearlType.small, { textAlign: "center", maxWidth: 280 }]}>{body}</Text>
      {action}
    </View>
  );
}

/** Placeholder block while loading. */
export const Skeleton = ({ h, r = 20, style }: { h: number; r?: number; style?: ViewStyle }) =>
  <View style={[{ height: h, borderRadius: r, backgroundColor: "rgba(255,255,255,0.55)" }, style]} />;

export function SmallButton({ title, onPress, primary, icon, disabled }: {
  title: string; onPress?: PressableProps["onPress"]; primary?: boolean; icon?: IconName; disabled?: boolean;
}) {
  const content = (
    <>
      {icon ? <Icon name={icon} size={15} color={primary ? "#fff" : pearl.accentDeep} strokeWidth={2} /> : null}
      <Text translate style={[styles.smallText, { color: primary ? "#fff" : pearl.accentDeep }]}>{title}</Text>
    </>
  );
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }}
      style={({ pressed }) => [pressed && styles.pressed, disabled && { opacity: 0.6 }]}>
      {primary
        ? <LinearGradient colors={pearlGradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.small, pearlShadow.button]}>{content}</LinearGradient>
        : <View style={[styles.small, styles.smallGhost]}>{content}</View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  iconBtn: { borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder, ...pearlShadow.card },
  badge: { position: "absolute", top: 5, right: 5, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3, backgroundColor: pearl.danger, borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 9.5, lineHeight: 12 },
  tile: { alignItems: "center", justifyContent: "center" },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontWeight: "600", fontSize: 11.5 },
  secH: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 2, paddingTop: 4 },
  card: { backgroundColor: pearl.glass, borderColor: pearl.glassBorder, borderWidth: 1, borderRadius: 22, paddingVertical: 4, overflow: "hidden", ...pearlShadow.card },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  divider: { height: 1, backgroundColor: pearl.divider, marginRight: 14 },
  stat: { flex: 1, minWidth: 0, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 20, backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder, gap: 2, ...pearlShadow.card },
  statTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  statValue: { fontWeight: "800", fontSize: 18, color: pearl.ink, marginTop: 2 },
  empty: { alignItems: "center", gap: 6, paddingVertical: 24, paddingHorizontal: 16 },
  small: { height: 36, paddingHorizontal: 14, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 6 },
  smallGhost: { backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: pearl.white },
  smallText: { fontWeight: "700", fontSize: 13 },
});
