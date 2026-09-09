const { withAndroidStyles } = require('@expo/config-plugins');

// Android still needs a launch window. Make its icon explicitly transparent
// so the animated React splash is the only branded launch screen.
module.exports = function withPlainLaunchScreen(config) {
  return withAndroidStyles(config, (config) => {
    const theme = config.modResults.resources.style?.find(
      (style) => style.$.name === 'Theme.App.SplashScreen',
    );
    if (!theme) throw new Error('Native splash theme is missing. Keep expo-splash-screen configured.');
    theme.item = (theme.item ?? []).filter(
      (item) => item.$.name !== 'windowSplashScreenAnimatedIcon',
    );
    theme.item.push({ $: { name: 'windowSplashScreenAnimatedIcon' }, _: '@android:color/transparent' });
    return config;
  });
};
