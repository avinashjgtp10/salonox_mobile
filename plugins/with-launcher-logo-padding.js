const fs = require('node:fs/promises');
const path = require('node:path');
const { withDangerousMod } = require('@expo/config-plugins');

// Add 8% on each side of the adaptive foreground, leaving the background
// full size. Keep the original artwork intact for other uses.
module.exports = function withLauncherLogoPadding(config) {
  return withDangerousMod(config, ['android', async (config) => {
    const resources = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res');
    for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
      const file = path.join(resources, 'mipmap-anydpi-v26', name);
      const xml = await fs.readFile(file, 'utf8');
      const padded = xml.replace(
        /<(foreground|monochrome)\s+android:drawable="([^"]+)"\s*\/>/g,
        (_, layer, drawable) => `<${layer}><inset android:drawable="${drawable}" android:insetLeft="8%" android:insetTop="8%" android:insetRight="8%" android:insetBottom="8%" /></${layer}>`,
      );
      await fs.writeFile(file, padded);
    }
    return config;
  }]);
};
