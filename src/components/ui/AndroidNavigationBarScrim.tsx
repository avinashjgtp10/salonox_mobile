import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * A solid band behind the Android navigation buttons.
 *
 * Edge-to-edge is mandatory from Expo SDK 54 (targetSdk 36): Android stops
 * reserving space for the navigation bar and ignores `navigationBarColor`, so
 * the page draws all the way down and its content shows through behind the
 * buttons. Turning edge-to-edge off is not an option any more, and it is also
 * what painted the pale strip under the tab bar in earlier QA builds
 * (see the comment in app.config.ts).
 *
 * So the band is drawn in-app instead: exactly the height of the bottom inset,
 * on top of the page, below the floating tab bar — which already offsets itself
 * by `insets.bottom`.
 *
 * Two things it deliberately does not do:
 * - nothing on iOS, where the home indicator is meant to float over content;
 * - it cannot cover a React Native `<Modal />`, which Android renders in its own
 *   window above this one. Full-screen sheets keep handling their own insets.
 */
export function AndroidNavigationBarScrim({ color }: { color: string }) {
  const insets = useSafeAreaInsets();

  // A zero inset means there is no navigation bar to back (or insets have not
  // resolved yet); a band of height 0 would be invisible anyway.
  if (Platform.OS !== "android" || insets.bottom <= 0) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        backgroundColor: color,
        bottom: 0,
        height: insets.bottom,
        left: 0,
        position: "absolute",
        right: 0,
      }}
    />
  );
}
