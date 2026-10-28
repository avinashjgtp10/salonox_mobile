import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { useContext } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Extra scroll space lets the last row move above the floating tab bar. */
export function useFooterClearance() {
  const height = useContext(BottomTabBarHeightContext);
  const insets = useSafeAreaInsets();
  return height === undefined ? 24 : height + Math.max(insets.bottom, 10) + 24;
}
