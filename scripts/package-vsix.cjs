// Build + verify the MARKETPLACE variant of the VSIX: voice/STT/ws stubbed out,
// README.marketplace.md / CHANGELOG.marketplace.md swapped in, and no scripts
// or dependencies in the shipped manifest. The fork build is a different
// artifact — that one is package-fork-vsix.cjs.
//
// Order matters. bundle.cjs must run BEFORE prepare-marketplace-package.cjs,
// because prepare deletes pkg.scripts — which is exactly what stops vsce from
// re-running vscode:prepublish and overwriting dist with an UNSTUBBED bundle.
// Restore always runs, so a failure never leaves the working tree swapped.
const { execSync } = require("child_process");
const fs = require("fs");

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const out = `${pkg.name}-${pkg.version}-marketplace.vsix`;

const run = (cmd, env) => execSync(cmd, { stdio: "inherit", env: { ...process.env, ...env } });

run("node scripts/bundle.cjs", { MARKETPLACE_BUNDLE: "1" });
run("node scripts/prepare-marketplace-package.cjs");

let failed = false;
try {
  run(`npx --yes @vscode/vsce package --no-dependencies -o ${JSON.stringify(out)}`);
  run(`node scripts/check-vsix-contents.cjs ${JSON.stringify(out)}`);
} catch {
  failed = true;
} finally {
  run("node scripts/restore-marketplace-package.cjs");
}

if (failed) process.exit(1);
console.log(`Marketplace VSIX ready: ${out}`);
