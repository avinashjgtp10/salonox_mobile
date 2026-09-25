const fs = require("fs");
const path = require("path");

const environmentName = process.argv[2];
const validEnvironments = new Set(["development", "qa", "production"]);

if (!validEnvironments.has(environmentName)) {
  console.error("Usage: node scripts/use-env.js <development|qa|production>");
  process.exit(1);
}

const rootDir = path.resolve(__dirname, "..");
const sourcePath = path.join(rootDir, `.env.${environmentName}`);
const targetPath = path.join(rootDir, ".env.local");

if (!fs.existsSync(sourcePath)) {
  console.error(`Missing environment file: ${path.basename(sourcePath)}`);
  process.exit(1);
}

const source = fs.readFileSync(sourcePath, "utf8");
const existing = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";
const existingValues = new Map(existing.split(/\r?\n/).map((line) => {
  const separator = line.indexOf("=");
  return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
}));
// Repeated development starts retain local overrides. Switching from QA or
// production still loads the development defaults, avoiding cross-env URLs.
const preserveDevUrls = environmentName === "development" &&
  existingValues.get("APP_ENV")?.replace(/^["']|["']$/g, "") === "development";
const localUrlKeys = new Set(["EXPO_PUBLIC_API_BASE_URL", "EXPO_PUBLIC_SOCKET_URL"]);

const managedKeys = new Set([
  "APP_ENV",
  "EXPO_PUBLIC_API_BASE_URL",
  "EXPO_PUBLIC_SOCKET_URL",
  "EXPO_PUBLIC_WEB_REGISTRATION_URL",
]);
const preservedLines = existing
  .split(/\r?\n/)
  .filter((line) => {
    const key = line.split("=")[0]?.trim();
    return key && !managedKeys.has(key);
  });

const nextEnv = [
  ...source.trim().split(/\r?\n/).map((line) => {
    const key = line.split("=")[0].trim();
    const localValue = existingValues.get(key);
    return preserveDevUrls && localUrlKeys.has(key) && localValue
      ? `${key}=${localValue}` : line;
  }),
  ...preservedLines,
]
  .filter(Boolean)
  .join("\n");

fs.writeFileSync(targetPath, `${nextEnv}\n`);
console.log(`Configured mobile environment: ${environmentName}`);
