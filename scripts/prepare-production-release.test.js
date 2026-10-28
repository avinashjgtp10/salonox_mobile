const { test } = require("node:test");
const assert = require("node:assert/strict");
const { prepareRelease, nextVersion } = require("./prepare-production-release");
const eas = require("../eas.json");
const source = 'const APP_VERSION = "1.0.1";\nruntimeVersion: `${appEnv}-${APP_VERSION}-product-scanner-v1`';
const env = { EXPO_TOKEN: "test-token", APP_STORE_CONNECT_APP_ID: "1234567890", GITHUB_SHA: "new-commit" };
const build = (appVersion, gitCommitHash = "old-commit") => ({ appVersion, gitCommitHash });

test("each release increases the patch by one from the latest production build", () => {
  const first = prepareRelease(source, eas, env, [build("1.0.1"), build("1.0.1")]);
  assert.equal(first.version, "1.0.2");
  assert.ok(first.appConfig.includes('const APP_VERSION = "1.0.2";'));
  assert.ok(first.appConfig.includes("${APP_VERSION}-product-scanner-v1"));
  assert.equal(first.easConfig.submit.production.ios.ascAppId, "1234567890");
  assert.equal(first.easConfig.submit.production.android.track, "production");
  assert.equal(first.easConfig.build.production.autoIncrement, true);
  assert.equal(eas.submit.production.ios.ascAppId, undefined);

  assert.equal(nextVersion("1.0.1", [build("1.0.2"), build("1.0.1")], "next-commit"), "1.0.3");
  assert.equal(nextVersion("1.0.1", [build("1.0.9"), build("1.0.10")], "next-commit"), "1.0.11");
});

test("re-running the same commit reuses its version", () => {
  assert.equal(nextVersion("1.0.1", [build("1.0.2", "new-commit"), build("1.0.1")], "new-commit"), "1.0.2");
});

test("a raised APP_VERSION base wins, then patches continue from it", () => {
  assert.equal(nextVersion("1.1.0", [build("1.0.5")], "c"), "1.1.0");
  assert.equal(nextVersion("1.1.0", [build("1.1.0")], "c"), "1.1.1");
  assert.equal(nextVersion("1.0.1", [], "c"), "1.0.1");
});

test("RELEASE_VERSION overrides the bump, but never below the latest build", () => {
  // iOS 1.0.3 finished but never shipped; Android 1.0.3 was cancelled.
  const builds = [build("1.0.3"), build("1.0.2")];
  const result = prepareRelease(source, eas, { ...env, RELEASE_VERSION: " 1.0.3 " }, builds);
  assert.equal(result.version, "1.0.3");
  assert.ok(result.appConfig.includes('const APP_VERSION = "1.0.3";'));
  assert.equal(prepareRelease(source, eas, { ...env, RELEASE_VERSION: "" }, builds).version, "1.0.4");
  assert.throws(() => prepareRelease(source, eas, { ...env, RELEASE_VERSION: "1.0.2" }, builds));
  assert.throws(() => prepareRelease(source, eas, { ...env, RELEASE_VERSION: "v1.0.3" }, builds));
});

test("missing release prerequisites fail before any file writes or builds", () => {
  for (const key of Object.keys(env)) {
    assert.throws(() => prepareRelease(source, eas, { ...env, [key]: "" }, []));
  }
  assert.throws(() => prepareRelease(source, eas, { ...env, APP_STORE_CONNECT_APP_ID: "com.salonox.app" }, []));
  assert.throws(() => prepareRelease(source, eas, env, undefined));
  assert.throws(() => prepareRelease("changed config format", eas, env, []));
});
