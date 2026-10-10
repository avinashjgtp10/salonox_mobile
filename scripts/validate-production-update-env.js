// Run through `eas env:exec production` before publishing an OTA update.
// Build-profile env values in eas.json are not inherited by EAS Update.
const { build } = require("../eas.json");

const expected = {
  ...build.production.env,
  EXPO_PUBLIC_WEB_REGISTRATION_URL: `${build.production.env.EXPO_PUBLIC_SOCKET_URL}/register`,
};

const invalid = Object.entries(expected)
  .filter(([key, value]) => process.env[key]?.trim() !== value)
  .map(([key]) => key);

if (invalid.length) {
  console.error(`Production update blocked: missing or incorrect EAS variables: ${invalid.join(", ")}.`);
  process.exit(1);
}

console.log("Production update environment validated.");
