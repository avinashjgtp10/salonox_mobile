// Decides whether the scheduled (Friday) store release has anything to build.
// Manual runs always build. Writes needed=true|false to GITHUB_OUTPUT.
const fs = require("node:fs");
const { changedAppFiles, listFinishedProductionBuilds, newestFirst, platformOf } = require("./release-utils");

const PLATFORMS = ["android", "ios"];
// The scheduled run is a late-Friday backup: a store build made by hand earlier
// that day (or a late Thursday one) is this week's release.
const RECENT_RELEASE_MS = 24 * 60 * 60 * 1000;

function storeReleaseNeeded(builds, head, appFilesChanged, now = Date.now()) {
  const latestOf = (platform) => newestFirst(builds).find((build) => platformOf(build) === platform);
  const isRecent = (build) => build && now - Date.parse(build.createdAt) < RECENT_RELEASE_MS;
  // Only finished builds are listed, so a platform whose build failed today has
  // no recent build and still goes through the change check below.
  if (PLATFORMS.every((platform) => isRecent(latestOf(platform)))) {
    const recent = latestOf(PLATFORMS[0]);
    const ago = Math.round((now - Date.parse(recent.createdAt)) / 3_600_000);
    return { needed: false, reasons: [`${recent.appVersion} was already built for both platforms ${ago}h ago`] };
  }
  const reasons = PLATFORMS.map((platform) => {
    const latest = latestOf(platform);
    if (!latest?.gitCommitHash) return `${platform}: no finished production build yet`;
    if (latest.gitCommitHash === head) return null;
    const changed = appFilesChanged(latest.gitCommitHash, head);
    if (changed && changed.length === 0) return null;
    return `${platform}: app changes since ${latest.appVersion} (${latest.gitCommitHash.slice(0, 8)})`;
  }).filter(Boolean);
  return { needed: reasons.length > 0, reasons };
}

if (require.main === module) {
  try {
    const head = process.env.GITHUB_SHA;
    if (!head) throw new Error("Missing GITHUB_SHA.");
    let result;
    if (process.env.GITHUB_EVENT_NAME !== "schedule") {
      result = { needed: true, reasons: ["manual run: building regardless of changes"] };
    } else {
      result = storeReleaseNeeded(listFinishedProductionBuilds(), head, changedAppFiles);
    }
    const summary = result.needed
      ? `Store release needed: ${result.reasons.join("; ")}.\n`
      : `Skipping this week's scheduled store release: ${
          result.reasons[0] ?? "no app changes since the last store build on either platform"
        }.\n`;
    console.log(summary);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `needed=${result.needed}\n`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { storeReleaseNeeded };
