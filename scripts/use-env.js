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
let existing = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";

const managedKeys = new Set(["EXPO_PUBLIC_API_BASE_URL", "EXPO_PUBLIC_SOCKET_URL"]);
const preservedLines = existing
  .split(/\r?\n/)
  .filter((line) => {
    const key = line.split("=")[0]?.trim();
    return key && !managedKeys.has(key);
  });

const nextEnv = [
  ...source.trim().split(/\r?\n/),
  ...preservedLines,
]
  .filter(Boolean)
  .join("\n");

fs.writeFileSync(targetPath, `${nextEnv}\n`);
console.log(`Configured mobile environment: ${environmentName}`);
