// Publishes the current main commit as an OTA to every recent store version
// that can safely run it. A store build only takes an OTA when its native code
// (Expo fingerprint) matches the current code: otherwise the new JS could call
// a native module the installed app does not have, and crash.
//
// Usage: node scripts/publish-production-ota.js [--dry-run]
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { SourceSkips, createFingerprintAsync } = require("@expo/fingerprint");
const utils = require("./release-utils");

const ROOT = path.resolve(__dirname, "..");
const APP_CONFIG = path.join(ROOT, "app.config.ts");
const VERSION_LINE = /const APP_VERSION = "(\d+\.\d+\.\d+)";/;
// Users on older store versions are left to the store-update popup.
const MAX_VERSIONS = 3;
// Version numbers, release notes (extra) and package.json scripts never reach native code.
const SOURCE_SKIPS =
  SourceSkips.ExpoConfigVersions |
  SourceSkips.ExpoConfigRuntimeVersionIfString |
  SourceSkips.ExpoConfigExtraSection |
  SourceSkips.PackageJsonScriptsAll |
  SourceSkips.GitIgnore;

const short = (sha) => sha.slice(0, 8);

// One target per platform and store version: the newest finished build of it,
// which is the one submitted to the store.
function selectTargets(builds, maxVersions = MAX_VERSIONS) {
  const seen = new Set();
  const targets = [];
  for (const build of utils.newestFirst(builds)) {
    const runtimeVersion = build.runtime?.version;
    if (!utils.SEMVER.test(build.appVersion ?? "") || !runtimeVersion || !build.gitCommitHash) continue;
    const platform = utils.platformOf(build);
    if (seen.has(`${platform}|${runtimeVersion}`)) continue;
    seen.add(`${platform}|${runtimeVersion}`);
    targets.push({
      platform,
      appVersion: build.appVersion,
      runtimeVersion,
      buildSha: build.gitCommitHash,
      buildTime: build.completedAt ?? build.createdAt,
    });
  }
  const versions = [...new Set(targets.map((target) => target.appVersion))]
    .sort((a, b) => utils.compareVersions(b, a))
    .slice(0, maxVersions);
  return targets
    .filter((target) => versions.includes(target.appVersion))
    .sort((a, b) => utils.compareVersions(b.appVersion, a.appVersion) || a.platform.localeCompare(b.platform));
}

// target.latestUpdate: the newest OTA already on that store version, or null.
async function decide(target, { head, appFilesChanged, runtimeFor, fingerprintOf }) {
  const update = target.latestUpdate;
  const baseline =
    update?.sha && Date.parse(update.createdAt) > Date.parse(target.buildTime) ? update.sha : target.buildSha;
  if (baseline === head) return { action: "skip", reason: `already running ${short(head)}` };
  const changed = appFilesChanged(baseline, head);
  if (changed && changed.length === 0) return { action: "skip", reason: `no app changes since ${short(baseline)}` };
  if (runtimeFor(target.appVersion) !== target.runtimeVersion) {
    return { action: "block", reason: "the runtimeVersion format in app.config.ts changed since this build" };
  }
  const [built, current] = await Promise.all([
    fingerprintOf(target.buildSha, target.platform),
    fingerprintOf(head, target.platform),
  ]);
  if (built !== current) {
    return { action: "block", reason: `native code changed since this store build (${short(target.buildSha)})` };
  }
  return { action: "publish", reason: `app changes since ${short(baseline)}` };
}

function withAppVersion(version, fn) {
  const original = fs.readFileSync(APP_CONFIG, "utf8");
  if (!VERSION_LINE.test(original)) throw new Error("Expected an explicit APP_VERSION in app.config.ts.");
  fs.writeFileSync(APP_CONFIG, original.replace(VERSION_LINE, `const APP_VERSION = "${version}";`));
  try {
    return fn();
  } finally {
    fs.writeFileSync(APP_CONFIG, original);
  }
}

function runtimeFor(version) {
  const cli = require.resolve("expo/bin/cli", { paths: [ROOT] });
  return withAppVersion(version, () => {
    const config = utils.run(process.execPath, [cli, "config", "--type", "public", "--json"], { cwd: ROOT });
    return JSON.parse(config).runtimeVersion;
  });
}

function latestUpdate(runtimeVersion, platform) {
  const args = ["--branch", "production", "--runtime-version", runtimeVersion, "--platform", platform];
  const list = JSON.parse(utils.run("eas", ["update:list", ...args, "--limit", "1", "--json", "--non-interactive"]));
  const group = list.currentPage?.[0]?.group;
  if (!group) return null;
  const updates = JSON.parse(utils.run("eas", ["update:view", group, "--json"]));
  const update = updates.find((entry) => entry.platform === platform);
  return update ? { sha: update.gitCommitHash ?? null, createdAt: update.createdAt } : null;
}

// Old commits are fingerprinted in a git worktree with their own node_modules,
// because autolinking reads the native modules that are actually installed.
const worktrees = new Map();
function projectAt(sha, head) {
  if (sha === head) return ROOT;
  if (!worktrees.has(sha)) {
    const dir = path.join(os.tmpdir(), `salonox-fingerprint-${short(sha)}`);
    fs.rmSync(dir, { recursive: true, force: true });
    utils.run("git", ["worktree", "add", "--force", "--detach", dir, sha], { stdio: "inherit" });
    worktrees.set(sha, dir);
    utils.run("npm", ["ci", "--no-audit", "--no-fund", "--loglevel=error"], { cwd: dir, stdio: "inherit" });
  }
  return worktrees.get(sha);
}

async function fingerprintAt(sha, platform, head) {
  const options = { platforms: [platform], sourceSkips: SOURCE_SKIPS, silent: true };
  return (await createFingerprintAsync(projectAt(sha, head), options)).hash;
}

function publish(appVersion, platforms, head) {
  const platform = platforms.length > 1 ? "all" : platforms[0];
  withAppVersion(appVersion, () =>
    utils.run(
      "eas",
      [
        "update",
        "--platform",
        platform,
        "--channel",
        "production",
        "--environment",
        "production",
        "--message",
        `OTA ${head} for ${appVersion}`,
        "--non-interactive",
      ],
      { cwd: ROOT, stdio: "inherit" },
    ),
  );
}

const cached = (cache, key, compute) => {
  if (!cache.has(key)) cache.set(key, compute());
  return cache.get(key);
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  process.env.APP_ENV = "production";
  const head = utils.run("git", ["rev-parse", "HEAD"]).trim();
  const targets = selectTargets(utils.listFinishedProductionBuilds());
  if (!targets.length) throw new Error("No finished production store builds found to send an OTA to.");

  const runtimes = new Map();
  const fingerprints = new Map();
  const context = {
    head,
    appFilesChanged: utils.changedAppFiles,
    runtimeFor: (version) => cached(runtimes, version, () => runtimeFor(version)),
    fingerprintOf: (sha, platform) => cached(fingerprints, `${sha}|${platform}`, () => fingerprintAt(sha, platform, head)),
  };
  for (const target of targets) {
    target.latestUpdate = latestUpdate(target.runtimeVersion, target.platform);
    Object.assign(target, await decide(target, context));
    console.log(`${target.appVersion} ${target.platform}: ${target.action} (${target.reason})`);
  }

  const byVersion = new Map();
  for (const target of targets.filter(({ action }) => action === "publish")) {
    byVersion.set(target.appVersion, [...(byVersion.get(target.appVersion) ?? []), target.platform]);
  }
  if (!dryRun) {
    for (const [appVersion, platforms] of byVersion) publish(appVersion, platforms, head);
  }

  const newest = targets[0].appVersion;
  const blockedNewest = targets.filter((target) => target.appVersion === newest && target.action === "block");
  const label = { publish: dryRun ? "Would publish" : "Published", skip: "Skipped", block: "Blocked" };
  const lines = [
    `### OTA for ${short(head)}${dryRun ? " (dry run)" : ""}`,
    "",
    "| Store version | Platform | Result | Why |",
    "| --- | --- | --- | --- |",
    ...targets.map((t) => `| ${t.appVersion} | ${t.platform} | ${label[t.action]} | ${t.reason} |`),
    "",
  ];
  if (blockedNewest.length) {
    lines.push(
      `**The latest store version ${newest} cannot take this as an OTA:** ${blockedNewest[0].reason}.`,
      "Ship it with a store build: wait for the Friday release or run **Mobile Store Release** manually.",
      "",
    );
  } else if (!byVersion.size) {
    lines.push("Nothing to publish: every store version already has these app changes.", "");
  }
  const summary = lines.join("\n");
  console.log(`\n${summary}`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  if (blockedNewest.length) process.exitCode = 1;
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(() => {
      for (const dir of worktrees.values()) {
        try {
          utils.run("git", ["worktree", "remove", "--force", dir], { stdio: "ignore" });
        } catch {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      }
    });
}

module.exports = { selectTargets, decide };
