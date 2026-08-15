// Package a full-build VSIX for this fork (voice + attach + clipboard).
// Never use the Marketplace stub path. Does not read workspace .env files.
const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const vsix = `${pkg.name}-${pkg.version}.vsix`;

process.env.MARKETPLACE_BUNDLE = "0";

for (const f of fs.readdirSync(".")) {
  if (f.endsWith(".vsix")) fs.unlinkSync(path.join(".", f));
}

execSync("npx --yes @vscode/vsce package --no-dependencies", {
  stdio: "inherit",
  env: process.env,
});

if (!fs.existsSync(vsix)) {
  console.error(`Missing ${vsix}`);
  process.exit(1);
}

const listing = execSync(`npx --yes @vscode/vsce ls "${vsix}"`, { encoding: "utf8" });
const blockedPath = /(?:^|[\\/])(?:\.env$|research[\\/]|test[\\/]|src[\\/]|node_modules[\\/])/i;
const badPaths = listing.split(/\r?\n/).filter((line) => blockedPath.test(line));
if (badPaths.length) {
  console.error("VSIX contains blocked paths:\n" + badPaths.join("\n"));
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "grok-fork-vsix-"));
const zip = path.join(tmp, "extension.zip");
fs.copyFileSync(vsix, zip);
execSync(
  `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zip}' -DestinationPath '${tmp}' -Force"`,
  { stdio: "ignore" },
);

const js = fs.readFileSync(path.join(tmp, "extension", "dist", "extension.js"), "utf8");
const shipped = JSON.parse(fs.readFileSync(path.join(tmp, "extension", "package.json"), "utf8"));
const chat = fs.readFileSync(path.join(tmp, "extension", "media", "chat.js"), "utf8");

const hostMissing = ["System.Speech", "StopFile", "writeTempAttach", "dropFileBytes"].filter(
  (m) => !js.includes(m),
);
const chatMissing = ["sealLiveOutputAbove", "handleModPaste"].filter((m) => !chat.includes(m));
if (hostMissing.length || chatMissing.length) {
  console.error(
    "VSIX is missing full-build markers:\n" + [...hostMissing, ...chatMissing].join("\n"),
  );
  process.exit(1);
}
if (js.includes("Voice input is not available") && !js.includes("System.Speech")) {
  console.error("VSIX looks like a Marketplace stub build (voice stripped)");
  process.exit(1);
}
if (shipped.version !== pkg.version) {
  console.error(`Shipped version ${shipped.version} != ${pkg.version}`);
  process.exit(1);
}

const haystack = js + "\n" + chat + "\n" + JSON.stringify(shipped);
const secretHits = [];
for (const [re, label] of [
  [/\bsk-[A-Za-z0-9]{10,}/, "openai-like key"],
  [/\bgho_[A-Za-z0-9]+/, "github token"],
  [/\bghp_[A-Za-z0-9]+/, "github token"],
  [/StoryGlide/i, "local project name"],
  [/Personal\\\\Projects/i, "local path"],
]) {
  if (re.test(haystack)) secretHits.push(label);
}
if (secretHits.length) {
  console.error("VSIX failed secret/local-data scan:\n" + secretHits.join("\n"));
  process.exit(1);
}

console.log(
  `Fork VSIX OK: ${vsix} version ${pkg.version} (${listing.split(/\r?\n/).filter(Boolean).length} files)`,
);
