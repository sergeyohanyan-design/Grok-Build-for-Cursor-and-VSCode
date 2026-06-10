const fs = require("fs");
const os = require("os");
const path = require("path");

const backupPath = path.join(os.tmpdir(), "grok-build-gui-marketplace-backup.json");
const backups = {
  readme: fs.readFileSync("README.md", "utf8"),
  changelog: fs.readFileSync("CHANGELOG.md", "utf8"),
  package: fs.readFileSync("package.json", "utf8"),
};

fs.writeFileSync(backupPath, JSON.stringify(backups));
fs.copyFileSync("README.marketplace.md", "README.md");
fs.copyFileSync("CHANGELOG.marketplace.md", "CHANGELOG.md");

const pkg = JSON.parse(backups.package);
delete pkg.dependencies;
delete pkg.devDependencies;
delete pkg.scripts;
pkg.description =
  "VS Code sidebar for the Grok Build CLI over the Agent Client Protocol. Plan, build, and ship with agent chat, edit approvals, file context, model selection, and session history.";
for (const key of [
  "grok.voiceApiKey",
  "grok.ffmpegPath",
  "grok.voiceInputDevice",
  "grok.voiceSendPhrase",
  "grok.voiceStreaming",
]) {
  delete pkg.contributes?.configuration?.properties?.[key];
}
pkg.keywords = ["agent", "sidebar", "developer-tools", "acp"];
fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");