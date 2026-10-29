const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const SEMVER = /^\d+\.\d+\.\d+$/;
const parse = (version) => version.split(".").map(Number);
const compare = (a, b) => a.map((part, i) => part - b[i]).find((diff) => diff !== 0) ?? 0;

function nextVersion(baseVersion, builds, commitSha) {
  const versioned = builds.filter((build) => SEMVER.test(build.appVersion ?? ""));
  // Re-running a release for the same commit must not consume a new version.
  const sameCommit = versioned.find((build) => build.gitCommitHash === commitSha);
  if (sameCommit) return sameCommit.appVersion;
  if (!versioned.length) return baseVersion;
  const [major, minor, patch] = versioned
    .map((build) => parse(build.appVersion))
    .reduce((max, version) => (compare(version, max) > 0 ? version : max));
  const bumped = [major, minor, patch + 1];
  const base = parse(baseVersion);
  return (compare(base, bumped) > 0 ? base : bumped).join(".");
}

// One-off override (GitHub variable RELEASE_VERSION), e.g. to reuse a version
// whose build was cancelled before reaching the stores. Delete it after the release.
function overrideVersion(override, builds) {
  if (!SEMVER.test(override)) throw new Error(`RELEASE_VERSION "${override}" must look like 1.2.3.`);
  const highest = builds
    .filter((build) => SEMVER.test(build.appVersion ?? ""))
    .map((build) => parse(build.appVersion))
    .reduce((max, version) => (compare(version, max) > 0 ? version : max), [0, 0, 0]);
  if (compare(parse(override), highest) < 0) {
    throw new Error(`RELEASE_VERSION ${override} is lower than the latest build ${highest.join(".")}. Delete the variable.`);
  }
  return override;
}

function prepareRelease(appConfig, easConfig, env, builds) {
  if (!env.EXPO_TOKEN?.trim()) throw new Error("Missing GitHub secret EXPO_TOKEN.");
  if (!/^\d+$/.test(env.APP_STORE_CONNECT_APP_ID || "")) {
    throw new Error("Set GitHub variable APP_STORE_CONNECT_APP_ID to the numeric Apple app ID.");
  }
  if (!env.GITHUB_SHA?.trim()) throw new Error("Missing GITHUB_SHA.");
  if (!Array.isArray(builds)) throw new Error("Expected a list of EAS production builds.");
  const match = appConfig.match(/const APP_VERSION = "(\d+\.\d+\.\d+)";/);
  if (!match) throw new Error("Expected an explicit APP_VERSION in app.config.ts.");
  const override = env.RELEASE_VERSION?.trim();
  const version = override ? overrideVersion(override, builds) : nextVersion(match[1], builds, env.GITHUB_SHA);
  const config = JSON.parse(JSON.stringify(easConfig));
  config.submit.production.ios.ascAppId = env.APP_STORE_CONNECT_APP_ID;
  return {
    version,
    appConfig: appConfig.replace(match[0], `const APP_VERSION = "${version}";`),
    easConfig: config,
  };
}

function listFinishedProductionBuilds() {
  const output = execFileSync(
    "eas",
    [
      "build:list",
      "--platform",
      "all",
      "--build-profile",
      "production",
      "--status",
      "finished",
      "--limit",
      "50",
      "--json",
      "--non-interactive",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
  return JSON.parse(output);
}

if (require.main === module) {
  try {
    const root = path.resolve(__dirname, "..");
    const appPath = path.join(root, "app.config.ts");
    const easPath = path.join(root, "eas.json");
    const result = prepareRelease(
      fs.readFileSync(appPath, "utf8"),
      JSON.parse(fs.readFileSync(easPath, "utf8")),
      process.env,
      listFinishedProductionBuilds(),
    );
    fs.writeFileSync(appPath, result.appConfig);
    fs.writeFileSync(easPath, `${JSON.stringify(result.easConfig, null, 2)}\n`);
    const summary = `Release version: ${result.version}. Android and iOS build numbers are incremented by EAS.\n`;
    console.log(summary);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { prepareRelease, nextVersion };
