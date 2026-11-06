/** Pearl page frame (prototype): background, pinned header, pull-to-refresh and helpers. */
import { useIsFocused } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { type ReactNode, type RefObject } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl, pearlType } from "@/components/auth/pearl/tokens";
import { Text } from "@/components/ui/AppTypography";
import { useFooterClearance } from "@/hooks/useFooterClearance";
import { Icon, type IconName } from "./Icon";
import { EmptyState, SmallButton } from "./ui";
import { NoInternetState } from "./NoInternetState";

export function Page({ children, header, refreshing, onRefresh, scrollRef }: {
  children: ReactNode; header?: ReactNode; refreshing?: boolean; onRefresh?: () => void; scrollRef?: RefObject<ScrollView | null>;
}) {
  const insets = useSafeAreaInsets();
  // Tab screens leave room for the floating tab bar; stack screens only for the home indicator.
  const footerClearance = useFooterClearance();
  const focused = useIsFocused();
  return (
    <PearlBackground>
      {focused ? <StatusBar style="dark" /> : null}
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {header ? <View style={styles.header}>{header}</View> : null}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(footerClearance, insets.bottom + 32) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={pearl.accent} colors={[pearl.accent]} /> : undefined}
        >
          {children}
        </ScrollView>
      </View>
    </PearlBackground>
  );
}

export function PageHeader({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <View style={styles.pageHeader}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Icon name="chevronLeft" size={20} color={pearl.ink} strokeWidth={2} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={pearlType.h2} numberOfLines={1} accessibilityRole="header">{title}</Text>
        {subtitle ? <Text style={pearlType.small} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={{ flexDirection: "row", gap: 8 }}>{right}</View> : null}
    </View>
  );
}

/** Prototype wording only; never the server's error text. */
export function LoadError({ offline, onRetry }: { offline?: boolean; onRetry: () => void }) {
  if (offline) return <NoInternetState onRetry={onRetry} />;
  return (
    <EmptyState
      icon={offline ? "wifiOff" : "alert"}
      title={offline ? "No internet connection" : "Couldn’t load this"}
      body={offline ? "Check your Wi-Fi or mobile data, then try again." : "Something went wrong on our side. Please try again."}
      action={<View style={{ marginTop: 8 }}><SmallButton title="Try again" icon="repeat" primary onPress={onRetry} /></View>}
    />
  );
}

export function Chips<T extends string>({ items, value, onChange }: { items: { key: T; label: string }[]; value: T; onChange: (key: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 18 }} style={{ marginHorizontal: -18, flexGrow: 0 }}>
      {items.map(item => {
        const on = item.key === value;
        return (
          <Pressable key={item.key} onPress={() => onChange(item.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            {on ? (
              <LinearGradient colors={["#B3AEDA", "#8D87BF", "#6B669F"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chip}>
                <Text style={[styles.chipText, { color: "#fff" }]}>{item.label}</Text>
              </LinearGradient>
            ) : <View style={[styles.chip, styles.chipOff]}><Text style={styles.chipText}>{item.label}</Text></View>}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function NoteBox({ icon = "info", children }: { icon?: IconName; children: ReactNode }) {
  return (
    <View style={styles.note}>
      <Icon name={icon} size={16} color={pearl.accentDeep} />
      <Text style={[pearlType.small, { color: pearl.ink2, flex: 1, lineHeight: 18 }]}>{children}</Text>
    </View>
  );
}

export function ProgressBar({ value, height = 7, style }: { value: number; height?: number; style?: ViewStyle }) {
  const width = `${Math.max(0, Math.min(100, value))}%` as const;
  return (
    <View style={[{ height, borderRadius: height / 2, backgroundColor: "rgba(120,118,150,0.14)", overflow: "hidden" }, style]}
      accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.max(0, Math.min(100, value))) }}>
      <LinearGradient colors={[pearl.accentTint, pearl.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width, height: "100%", borderRadius: height / 2 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18 },
  content: { paddingHorizontal: 18, paddingTop: 4, gap: 14 },
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  back: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder },
  chip: { height: 34, paddingHorizontal: 13, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  chipOff: { backgroundColor: "rgba(255,255,255,0.55)", borderWidth: 1, borderColor: pearl.glassBorder },
  chipText: { fontWeight: "600", fontSize: 12.5, color: pearl.ink2 },
  note: { flexDirection: "row", gap: 10, alignItems: "flex-start", padding: 12, borderRadius: 16, backgroundColor: pearl.infoBg },
});
