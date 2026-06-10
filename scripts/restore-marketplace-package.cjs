const fs = require("fs");
const os = require("os");
const path = require("path");

const backupPath = path.join(os.tmpdir(), "grok-build-gui-marketplace-backup.json");
if (!fs.existsSync(backupPath)) process.exit(0);
const backups = JSON.parse(fs.readFileSync(backupPath, "utf8"));
fs.writeFileSync("README.md", backups.readme);
if (backups.changelog) fs.writeFileSync("CHANGELOG.md", backups.changelog);
fs.writeFileSync("package.json", backups.package);
fs.unlinkSync(backupPath);