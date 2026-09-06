// Post-package guard: fail if the VSIX contains dev artifacts or scanner tripwires.
// Reads the zip in-process (see vsix-zip.cjs) rather than extracting to a temp
// dir, so it behaves the same on CI, Git Bash, and PowerShell.
const fs = require("fs");
const { readVsix } = require("./vsix-zip.cjs");

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const vsix = process.argv[2] || `${pkg.name}-${pkg.version}.vsix`;
if (!fs.existsSync(vsix)) {
  console.error(`Missing ${vsix}`);
  process.exit(1);
}

const entries = readVsix(fs.readFileSync(vsix));
const names = [...entries.keys()];

const blockedPath = /agent-tools|node_modules|\.env$|research\/|test\//i;
const badPaths = names.filter((name) => blockedPath.test(name));
if (badPaths.length) {
  console.error("VSIX contains blocked paths:\n" + badPaths.join("\n"));
  process.exit(1);
}

const manifest = entries.get("extension/package.json");
if (manifest) {
  const shipped = JSON.parse(manifest.toString("utf8"));
  if (shipped.scripts || shipped.devDependencies || shipped.dependencies) {
    console.error("VSIX package.json must not ship scripts or dependencies");
    process.exit(1);
  }
}

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
for (const name of names) {
  if (!/\.(js|md|json)$/i.test(name)) continue;
  const text = entries.get(name).toString("utf8");
  for (const [re, label] of blockedText) {
    if (re.test(text)) hits.push(`${name}: ${label}`);
  }
}
if (hits.length) {
  console.error("VSIX contains blocked patterns:\n" + hits.join("\n"));
  process.exit(1);
}

console.log(`VSIX OK (${names.length} entries) ${vsix}`);
