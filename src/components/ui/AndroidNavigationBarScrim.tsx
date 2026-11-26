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
/**
 * Android reserves about 48dp for the three-button navigation bar, and only
 * about 16-24dp for the gesture pill. There is no API that reports which mode
 * the phone is in, so the inset height is the signal.
 *
 * Below this, the band is a flat strip behind a translucent pill over content
 * the user can still see — the pale strip this whole thing exists to avoid.
 */
const BUTTON_NAV_MIN_INSET = 32;

export function AndroidNavigationBarScrim({ color }: { color: string }) {
  const insets = useSafeAreaInsets();

  // A zero inset means no navigation bar at all (or insets have not resolved
  // yet). Anything short of a button bar is gesture navigation, which must
  // stay transparent: the gesture area is meant to float over the page.
  if (Platform.OS !== "android" || insets.bottom < BUTTON_NAV_MIN_INSET) return null;

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
