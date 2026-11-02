// Shared by the production OTA and store release pipelines.
const { execFileSync } = require("node:child_process");

const SEMVER = /^\d+\.\d+\.\d+$/;
const compareVersions = (a, b) => {
  const [x, y] = [a, b].map((version) => version.split(".").map(Number));
  return x.map((part, i) => part - y[i]).find((diff) => diff !== 0) ?? 0;
};

// Files that never reach a user's phone. A change touching only these needs
// neither an OTA nor a store build. release-notes.json is here because new
// notes alone are not worth a "restart to update" popup.
const NON_APP_FILES = [
  /^\.github\//,
  /^\.vscode\//,
  /^docs\//,
  /^scripts\//,
  /^tests\//,
  /(^|\/)__tests__\//,
  /\.test\.[cm]?[jt]sx?$/,
  /\.md$/i,
  /^(LICENSE|\.gitignore|eslint\.config\.js|jest\.config\.js|tsconfig\.test\.json|release-notes\.json)$/,
];
const isAppFile = (file) => !NON_APP_FILES.some((pattern) => pattern.test(file));

// eas and npm are .cmd shims on Windows, which Node only starts through a shell.
const run = (command, args, options = {}) =>
  execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    shell: process.platform === "win32" && ["eas", "npm"].includes(command),
    ...options,
  });

// null when git cannot compare the commits: callers must then assume app changes.
function changedAppFiles(base, head) {
  try {
    return run("git", ["diff", "--name-only", base, head], { stdio: ["ignore", "pipe", "ignore"] })
      .split("\n")
      .filter(Boolean)
      .filter(isAppFile);
  } catch {
    return null;
  }
}

function listFinishedProductionBuilds() {
  const args = ["build:list", "--platform", "all", "--build-profile", "production", "--status", "finished"];
  return JSON.parse(run("eas", [...args, "--limit", "50", "--json", "--non-interactive"]));
}

// Newest build first; EAS reports platforms as ANDROID / IOS.
const newestFirst = (builds) => [...builds].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
const platformOf = (build) => String(build.platform).toLowerCase();

module.exports = {
  SEMVER,
  compareVersions,
  isAppFile,
  run,
  changedAppFiles,
  listFinishedProductionBuilds,
  newestFirst,
  platformOf,
};
