// Fail the package if README still contains strings that trigger Marketplace scanners.
const fs = require("fs");
const readme = fs.readFileSync("README.md", "utf8");
const blocked = [
  /\|\s*iex\b/i,
  /\birm\s+https?:\/\//i,
  /curl\s+-[a-z]*\s*.*\|\s*bash/i,
  /XAI_API_KEY\s*=/i,
];
const hits = blocked.filter((re) => re.test(readme)).map((re) => re.source);
if (hits.length) {
  console.error("README.md contains Marketplace-blocked patterns:", hits.join(", "));
  process.exit(1);
}