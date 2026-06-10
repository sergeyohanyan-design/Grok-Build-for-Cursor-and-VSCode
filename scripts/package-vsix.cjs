const { execSync } = require("child_process");

let failed = false;
try {
  execSync("npx @vscode/vsce package --no-dependencies", { stdio: "inherit" });
  execSync("node scripts/check-vsix-contents.cjs", { stdio: "inherit" });
} catch {
  failed = true;
} finally {
  execSync("node scripts/restore-marketplace-package.cjs", { stdio: "inherit" });
}
process.exit(failed ? 1 : 0);