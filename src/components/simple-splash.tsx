import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import AnimatedSplash from './animated-splash';

type SimpleSplashProps = {
  backgroundColor: string;
  isReady: boolean;
};

export default function SimpleSplash({ backgroundColor, isReady }: SimpleSplashProps) {
  const [visible, setVisible] = useState(true);

  const handlePrepared = useCallback(async () => {
    await SplashScreen.hideAsync().catch(() => {});
  }, []);

  const handleComplete = useCallback(() => {
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor }]} accessibilityViewIsModal>

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
