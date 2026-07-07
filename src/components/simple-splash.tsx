import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { SageGold } from '@/constants/theme';

export default function SimpleSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
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
    backgroundColor: SageGold.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  logo: {
    width: 120,
    height: 120,
  },
});
