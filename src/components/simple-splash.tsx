import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import AnimatedSplash from './animated-splash';

type SimpleSplashProps = {
  // Resolved from the active theme so this overlay never flashes the wrong
  // (light-only) background while the real theme preference is still loading.
  backgroundColor: string;
  // True once the auth/session check AND the theme preference have both
  // resolved and the initial login-vs-dashboard redirect decision has been
  // applied. Holding the splash on this instead of a fixed timer is what
  // prevents the Login screen (or the wrong theme) from flashing when the
  // session check (token refresh, /users/me) takes longer than a hardcoded
  // delay would allow for.
  isReady: boolean;
};

export default function SimpleSplash({ backgroundColor, isReady }: SimpleSplashProps) {
  const [visible, setVisible] = useState(true);

  // Called once the intro has painted its first frame — handing over from the
  // native splash only then is what keeps the seam invisible.
  const handlePrepared = useCallback(async () => {
    await SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Called after the closing zoom/fade has finished, never before, so the app
  // is only revealed once the transition has actually played.
  const handleComplete = useCallback(() => {
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor }]} accessibilityViewIsModal>
      {/* Dark icons for the light splash backdrop. Deliberately not hidden —
          toggling the bar off and back on would jolt the layout underneath. */}
      <StatusBar style="dark" />
      <AnimatedSplash isReady={isReady} onPrepared={handlePrepared} onComplete={handleComplete} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    elevation: 1000,
    zIndex: 1000,
  },
});
