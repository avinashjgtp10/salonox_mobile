import { Ionicons } from "@expo/vector-icons";
import { memo, useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { DashboardRadius as Radius, type ThemeColors } from "@/constants/theme";
import { formatCurrency } from "@/features/quickSale/utils/money";
import { useThemeColors } from "@/theme/ThemeProvider";

type MiniBillBarProps = {
  disabled: boolean;
  grandTotal: number;
  itemCount: number;
  onCheckout: () => void;
};

function MiniBillBarComponent({ disabled, grandTotal, itemCount, onCheckout }: MiniBillBarProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const progress = useRef(new Animated.Value(itemCount > 0 ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
      toValue: itemCount > 0 ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [itemCount, progress]);

  const animatedStyle = {
    opacity: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1],
    }),
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [16, 0],
        }),
      },
    ],
  };

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, animatedStyle]}>
      <View style={[styles.card, disabled && styles.cardDisabled]}>
        <View style={styles.copy}>
          <Text style={styles.itemCount}>
            {itemCount} Item{itemCount === 1 ? "" : "s"}
          </Text>
          <Text style={styles.total}>{formatCurrency(grandTotal)}</Text>
        </View>

        <Pressable
          android_ripple={disabled ? undefined : { color: "rgba(255, 255, 255, 0.12)", borderless: false }}
          disabled={disabled}
          onPress={onCheckout}
          style={({ pressed }) => [styles.cta, pressed && !disabled && styles.cardPressed]}
        >
          <Text style={styles.ctaText}>Checkout</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.onPrimary} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

export const MiniBillBar = memo(MiniBillBarComponent);

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  wrap: {
    bottom: 18,
    left: 16,
    position: "absolute",
    right: 16,
    zIndex: 80,
  },
  card: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: 30,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 84,
    paddingHorizontal: 18,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 18,
  },
  cardDisabled: {
    opacity: 0.98,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
  },
  copy: {
    flex: 1,
  },
  itemCount: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  total: {
    color: Colors.heading,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4,
  },
  cta: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    minWidth: 118,
    paddingHorizontal: 16,
  },
  ctaText: {
    color: Colors.onPrimary,
    fontSize: 15,
    fontWeight: "900",
  },
});
