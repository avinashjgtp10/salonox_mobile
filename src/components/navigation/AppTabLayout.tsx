/**
 * App tab bar (prototype): a floating pearl pill. When a tab is `raised` (Lunox AI for
 * owners, Quick Sale for staff) the bar's top edge dips into a notch under that tab's
 * round button, which floats separately above the bar.
 */
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { router, Tabs, type Href } from "expo-router";
import { type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { Image, type LayoutChangeEvent, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";

import { pearl, pearlGradients } from "@/components/auth/pearl/tokens";
import { Icon, type IconName } from "@/components/pearl/Icon";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/AppTypography";

const BAR_H = 70; // pill height
const LIFT = 26; // space above the pill for the notch and the raised button
const R = 26; // pill corner radius
const SHADOW_RINGS = [{ width: 22, opacity: 0.025 }, { width: 14, opacity: 0.035 }, { width: 7, opacity: 0.05 }];
const LUNOX_MARK = require("../../../assets/images/brand/lunox-mark.png");

export type AppTabItem = {
  icon: IconName;
  name: string;
  title: string;
  /** Opens this route instead of switching tabs (e.g. Quick Sale). */
  actionHref?: Href;
  /** Runs instead of switching tabs (e.g. Lunox AI opens over the current tab). */
  onPress?: () => void;
  /** Round button floating above a notch in the bar. */
  raised?: "lunox" | "action";
  badge?: number;
};

type AppTabLayoutProps = {
  children?: ReactNode;
  tabs: AppTabItem[];
};

/** Pill outline whose top edge curves down under the centre button. */
function barPath(w: number, notch: boolean) {
  const c = w / 2, t = LIFT, b = LIFT + BAR_H;
  const top = notch
    ? [`H${c - 53}`, `C${c - 41} ${t} ${c - 36} ${t + 6} ${c - 31.7} ${t + 15}`, `A36 36 0 0 0 ${c + 31.7} ${t + 15}`, `C${c + 36} ${t + 6} ${c + 41} ${t} ${c + 53} ${t}`]
    : [];
  return [
    `M${R} ${t}`, ...top,
    `H${w - R}`, `A${R} ${R} 0 0 1 ${w} ${t + R}`, `V${b - R}`, `A${R} ${R} 0 0 1 ${w - R} ${b}`,
    `H${R}`, `A${R} ${R} 0 0 1 0 ${b - R}`, `V${t + R}`, `A${R} ${R} 0 0 1 ${R} ${t}`, "Z",
  ].join(" ");
}

function PearlTabBar({ state, descriptors, navigation, tabs }: BottomTabBarProps & { tabs: AppTabItem[] }) {
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);
  useEffect(() => { reportHeight?.(BAR_H + LIFT); }, [reportHeight]);
  const visible = state.routes.filter((route) => tabs.some((tab) => tab.name === route.name)).map((route) => { const tab = tabs.find((item) => item.name === route.name)!; return { ...tab, title: descriptors[route.key]?.options.title ?? tab.title }; });
  return <PearlNavigationBar tabs={visible} activeName={state.routes[state.index]?.name} onNavigate={(name) => { const route = state.routes.find((item) => item.name === name); if (!route) return; const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true }); if (state.routes[state.index]?.name !== name && !event.defaultPrevented) navigation.navigate(name, route.params); }} />;
}

export function PearlNavigationBar({ tabs, activeName, onNavigate }: { tabs: AppTabItem[]; activeName?: string; onNavigate: (name: string) => void }) {
  const insets = useSafeAreaInsets();
  const [w, setW] = useState(0);
  const items = useMemo(() => new Map(tabs.map(tab => [tab.name, tab])), [tabs]);
  const routes = tabs.map((tab) => ({ name: tab.name, key: tab.name }));
  const notch = routes.some(route => items.get(route.name)?.raised);
  const d = useMemo(() => (w ? barPath(w, notch) : ""), [notch, w]);

  const onLayout = (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width));

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.bar} onLayout={onLayout}>
        {w ? (
          <Svg width={w + 24} height={BAR_H + LIFT + 24} viewBox={`-12 0 ${w + 24} ${BAR_H + LIFT + 24}`} style={styles.svg} pointerEvents="none">
            <Defs>
              <SvgGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.97} />
                <Stop offset="1" stopColor="#F9F8FC" stopOpacity={0.96} />
              </SvgGradient>
              <SvgGradient id="edge" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={pearl.accentTint} stopOpacity={0.6} />
                <Stop offset="0.5" stopColor={pearl.accent} stopOpacity={0.9} />
                <Stop offset="1" stopColor={pearl.accentTint} stopOpacity={0.6} />
              </SvgGradient>
            </Defs>
            {/* Soft drop shadow under the shape (prototype: blurred copy, 22% ink, 6px down). */}
            {SHADOW_RINGS.map(ring => (
              <Path key={ring.width} d={d} translateY={6} fill="none" stroke="#46446E" strokeOpacity={ring.opacity} strokeWidth={ring.width} strokeLinejoin="round" />
            ))}
            <Path d={d} fill="url(#fill)" stroke="url(#edge)" strokeWidth={1.6} />
            <Path d={d} translateY={1.2} fill="none" stroke="#FFFFFF" strokeOpacity={0.9} strokeWidth={1} />
          </Svg>
        ) : null}

        <View style={styles.row}>
          {routes.map(route => {
            const tab = items.get(route.name)!;
            const focused = activeName === route.name;
            const label = tab.title;
            const onPress = () => {
              if (tab.onPress) return tab.onPress();
              if (tab.actionHref) return router.push(tab.actionHref);
              onNavigate(route.name);
            };

            if (tab.raised) {
              return (
                <Pressable key={route.key} onPress={onPress} style={styles.slot} accessibilityRole="button" accessibilityLabel={label}>
                  {tab.raised === "lunox" ? (
                    <View style={styles.raised}>
                      <Image source={LUNOX_MARK} style={{ width: 28, height: 28 }} resizeMode="contain" />
                    </View>
                  ) : (
                    <LinearGradient colors={pearlGradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.raised, styles.raisedAction]}>
                      <Icon name={tab.icon} size={24} color="#fff" strokeWidth={2} />
                    </LinearGradient>
                  )}
                  <View style={{ height: 22 }} />
                  <Text style={[styles.label, styles.raisedLabel]} numberOfLines={1}>{label}</Text>
                  <View style={[styles.marker, { opacity: 0 }]} />
                </Pressable>
              );
            }

            const color = focused ? pearl.accentDeep : pearl.muted;
            return (
              <Pressable key={route.key} onPress={onPress} style={styles.slot}
                accessibilityRole="tab" accessibilityState={{ selected: focused }}
                accessibilityLabel={`${label} tab${tab.badge ? `, ${tab.badge} unread` : ""}`}>
                <View>
                  {tab.name === "whatsapp"
                    ? <Ionicons name="logo-whatsapp" size={22} color={color} />
                    : <Icon name={tab.icon} size={22} color={color} />}
                  {tab.badge ? <View style={styles.badge}><Text style={styles.badgeText}>{tab.badge > 99 ? "99+" : tab.badge}</Text></View> : null}
                </View>
                <Text style={[styles.label, { color }]} numberOfLines={1}>{label}</Text>
                <View style={[styles.marker, !focused && { opacity: 0 }]} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export function AppTabLayout({ children, tabs }: AppTabLayoutProps) {
  return (
      <Tabs
        screenOptions={{ freezeOnBlur: true, headerShown: false, sceneStyle: { backgroundColor: pearl.bgTop } }}
        tabBar={props => <PearlTabBar {...props} tabs={tabs} />}
      >
        {tabs.map(tab => <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />)}
        {children}
      </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 14, right: 14 },
  bar: {
    height: BAR_H, marginTop: LIFT,
    ...Platform.select({ ios: { shadowColor: "#46446E", shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }, default: {} }),
  },
  svg: { position: "absolute", top: -LIFT, left: -12 },
  row: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 6 },
  slot: { flex: 1, alignSelf: "stretch", alignItems: "center", justifyContent: "center", gap: 3, paddingTop: 6 },
  label: { fontWeight: "600", fontSize: 10.5 },
  marker: { width: 18, height: 3, borderRadius: 2, backgroundColor: pearl.accent, marginTop: 2 },
  raised: {
    position: "absolute", top: -30, alignSelf: "center",
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center", backgroundColor: "#FBFAFD",
    borderWidth: 3, borderColor: pearl.accentTint,
    shadowColor: "#1F3A45", shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  raisedAction: { borderColor: "#FBFAFD" },
  raisedLabel: { color: "#1F3A45" },
  badge: { position: "absolute", top: -5, right: -9, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, backgroundColor: pearl.accent, borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 9, lineHeight: 11 },
});
