import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import SalonOXSplash from './splash/SalonOXSplash';

type SimpleSplashProps = {
  backgroundColor: string;
  isReady: boolean;
};

export default function SimpleSplash({ backgroundColor, isReady }: SimpleSplashProps) {
  const [visible, setVisible] = useState(true);

  // The JS splash is on screen as soon as this mounts, so the native launch
  // screen can go: keeping both would hide the animation behind a static image.
  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {});
  }, []);

  const handleFinish = useCallback(() => {
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor }]} accessibilityViewIsModal>
      <StatusBar style="dark" />
      {/* `ready` holds the splash past its animation until the app has hydrated
          its theme and navigation, matching the previous behaviour. */}
      <SalonOXSplash ready={isReady} onFinish={handleFinish} />
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
