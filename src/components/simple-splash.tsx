import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

type SimpleSplashProps = {
  // Resolved from the active theme so this overlay never flashes the wrong
  // (light-only) background while the real theme preference is still loading.
  backgroundColor: string;
  // True once the auth/session check AND the theme preference have both
  // resolved and the initial login-vs-dashboard redirect decision has been
  // applied. Hiding on this instead of a fixed timer is what prevents the
  // Login screen (or the wrong theme) from flashing when the session check
  // (token refresh, /users/me) takes longer than a hardcoded delay would
  // allow for.
  isReady: boolean;
};

export default function SimpleSplash({ backgroundColor, isReady }: SimpleSplashProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {});
      setVisible(false);
    }
  }, [isReady]);

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor }]}>
      <Image
        source={require('../../assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  logo: {
    width: 120,
    height: 120,
  },
});
