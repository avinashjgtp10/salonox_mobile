import { router, type Href } from "expo-router";
import { StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle, type TouchableOpacityProps } from "react-native";
import { Icon } from "@/components/pearl/Icon";
import { pearl } from "@/components/auth/pearl/tokens";
import { AppLayout } from "@/constants/layout";

type AppBackButtonProps = Omit<TouchableOpacityProps, "onPress"> & {
  fallbackHref?: Href;
  onPress?: () => void;
};
export function AppBackButton({ fallbackHref, onPress, style, ...props }: AppBackButtonProps) {
  const handlePress = () => {
    if (onPress) return onPress();
    if (router.canGoBack()) return router.back();
    if (fallbackHref) router.replace(fallbackHref);
  };
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" activeOpacity={0.84} hitSlop={AppLayout.headerActionHitSlop} {...props} onPress={handlePress} style={[style, styles.button]}>
    <Icon name="chevronLeft" size={20} color={pearl.ink} strokeWidth={2} />
  </TouchableOpacity>;
}
export function AppBackButtonPlaceholder({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[style, styles.button, styles.placeholder]} />;
}
const styles = StyleSheet.create({
  button: { width: 42, height: 42, flexShrink: 0, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.95)", borderWidth: 1, shadowColor: "#46446E", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 0 },
  placeholder: { opacity: 0 },
});
