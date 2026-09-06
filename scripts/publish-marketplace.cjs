// `npm run publish` — VS Code Marketplace.
//
// It used to be a bare `vsce publish`, which quietly shipped the FORK build:
// vsce runs vscode:prepublish -> bundle.cjs, and with MARKETPLACE_BUNDLE unset
// that bundles voice/STT/ws in, keeps the fork README, and leaves the `ws`
// dependency in the manifest. The marketplace-prepare step never ran at all.
//
// So build the marketplace artifact properly, verify it, then publish that
// exact file. Extra args are passed through to vsce (e.g. --pre-release).
const { execSync } = require("child_process");
const fs = require("fs");

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const vsix = `${pkg.name}-${pkg.version}-marketplace.vsix`;

if (!process.env.VSCE_PAT) {
  console.error(
    "VSCE_PAT is not set. Publishing needs an Azure DevOps token for publisher " +
      `'${pkg.publisher}'. Set VSCE_PAT and re-run, or run 'npx @vscode/vsce login ${pkg.publisher}' once.`,
  );
  process.exit(1);
}

execSync("node scripts/package-vsix.cjs", { stdio: "inherit" });
if (!fs.existsSync(vsix)) {
  console.error(`Missing ${vsix}`);
  process.exit(1);
}

const extra = process.argv.slice(2);
execSync(
  ["npx --yes @vscode/vsce publish --packagePath", JSON.stringify(vsix), ...extra].join(" "),
  { stdio: "inherit" },
);

console.log(`\nPublished ${pkg.publisher}.${pkg.name} ${pkg.version} to the VS Code Marketplace.`);
console.log("Open VSX is separate and automated: npm run publish:ovsx");
