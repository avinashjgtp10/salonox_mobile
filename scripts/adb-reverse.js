const { spawnSync } = require("node:child_process");
const path = require("node:path");

const adbPath = path.join(
  process.env.LOCALAPPDATA || "",
  "Android",
  "Sdk",
  "platform-tools",
  "adb.exe",
);

const args = process.argv.includes("--list")
  ? ["reverse", "--list"]
  : ["reverse", "tcp:8083", "tcp:8083"];

const result = spawnSync(adbPath, args, { stdio: "inherit" });

if (result.error) {
  console.error(`Failed to run adb at ${adbPath}`);
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
