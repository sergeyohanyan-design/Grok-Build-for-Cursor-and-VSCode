// Post-package guard: fail if the VSIX contains dev artifacts or scanner tripwires.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const vsix = `${pkg.name}-${pkg.version}.vsix`;
if (!fs.existsSync(vsix)) {
  console.error(`Missing ${vsix}`);
  process.exit(1);
}

const listing = execSync(`npx @vscode/vsce ls ${vsix}`, { encoding: "utf8" });
const lines = listing.split(/\r?\n/).filter(Boolean);
const blockedPath = /agent-tools|node_modules|\.env$|research\/|test\//i;
const badPaths = lines.filter((line) => blockedPath.test(line));
if (badPaths.length) {
  console.error("VSIX contains blocked paths:\n" + badPaths.join("\n"));
  process.exit(1);
}

const tmp = require("os").tmpdir();
const zip = path.join(tmp, `grok-vsix-scan-${Date.now()}.zip`);
const dir = path.join(tmp, `grok-vsix-scan-${Date.now()}`);
fs.copyFileSync(vsix, zip);
require("child_process").execSync(
  process.platform === "win32"
    ? `powershell -NoProfile -Command "Expand-Archive -Path '${zip}' -DestinationPath '${dir}' -Force"`
    : `unzip -qo '${zip}' -d '${dir}'`,
  { stdio: "ignore" },
);

const extRoot = path.join(dir, "extension");
const pkgPath = path.join(extRoot, "package.json");
if (fs.existsSync(pkgPath)) {
  const shipped = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  if (shipped.scripts || shipped.devDependencies || shipped.dependencies) {
    console.error("VSIX package.json must not ship scripts or dependencies");
    process.exit(1);
  }
}

const scanFiles = [];
function walk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.(js|md|json)$/i.test(ent.name)) scanFiles.push(p);
  }
}
walk(extRoot);

const blockedText = [
  [/api\.x\.ai/i, "api.x.ai"],
  [/wss:\/\//i, "wss://"],
  [/XAI_API_KEY/i, "XAI_API_KEY"],
  [/\birm\s+https?:\/\//i, "irm https://"],
  [/getSessionToken/i, "getSessionToken"],
  [/jsonwebtoken/i, "jsonwebtoken"],
  [/console\.x\.ai/i, "console.x.ai"],
  [/security scanning/i, "security scanning"],
  [/voice\/STT/i, "voice/STT"],
];
const hits = [];
for (const file of scanFiles) {
  const rel = path.relative(extRoot, file).replace(/\\/g, "/");
  const text = fs.readFileSync(file, "utf8");
  for (const [re, label] of blockedText) {
    if (re.test(text)) hits.push(`${rel}: ${label}`);
  }
}
if (hits.length) {
  console.error("VSIX contains blocked patterns:\n" + hits.join("\n"));
  process.exit(1);
}

console.log(`VSIX OK (${lines.length} files)`);