const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const sdkAdbPath = path.join(
  process.env.LOCALAPPDATA || "",
  "Android",
  "Sdk",
  "platform-tools",
  "adb.exe",
);

const adbPath = fs.existsSync(sdkAdbPath) ? sdkAdbPath : "adb";

const PORTS = [8083, 3000];

const runAdb = (args) => spawnSync(adbPath, args, { stdio: "inherit" });

if (process.argv.includes("--list")) {
  const result = runAdb(["reverse", "--list"]);

  if (result.error) {
    console.error(`Failed to run adb at ${adbPath}`);
    console.error(result.error.message);
    process.exit(1);
  }

  process.exit(result.status ?? 0);
}

for (const port of PORTS) {
  const result = runAdb(["reverse", `tcp:${port}`, `tcp:${port}`]);

  if (result.error) {
    console.error(`Failed to run adb at ${adbPath}`);
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`adb reverse failed for port ${port} — is a device attached?`);
    process.exit(result.status ?? 1);
  }

  console.log(`Reverse tunnel ready: localhost:${port} -> host ${port}`);
}
