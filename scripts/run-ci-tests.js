const { spawnSync } = require("node:child_process");

function run(modulePath, args, capture = false) {
  const result = spawnSync(process.execPath, [require.resolve(modulePath), ...args], {
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout;
}

// Use Jest's own discovery so newly added tests automatically run again.
const tests = JSON.parse(run("jest/bin/jest", ["--listTests", "--json", "--runInBand"], true));
if (tests.length === 0) {
  console.log("No regression tests are present; skipping test compilation and Jest execution.");
} else {
  run("typescript/bin/tsc", ["--project", "tsconfig.test.json"]);
  run("jest/bin/jest", ["--ci", "--runInBand"]);
}
