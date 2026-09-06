// Read a .vsix in-process. A .vsix is a zip, and every shell-out we tried
// broke somewhere: GNU tar (Linux CI, Git Bash) has no zip support at all and
// exits 2/128 with no stderr, only Windows' bsdtar reads them, `unzip` is not
// guaranteed to be installed, and Expand-Archive is flaky on a renamed .zip.
// zlib is in stdlib and behaves the same everywhere.
//
// ponytail: no zip64 and no encryption — a vsix is ~130KB with ~20 entries,
// nowhere near the 4GB / 65535-entry limits that need zip64. If a build ever
// fails here with "no end-of-central-directory record" on a genuinely huge
// vsix, that is the ceiling and zip64 parsing is the upgrade.
const zlib = require("zlib");

const EOCD_SIG = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
const CDIR_SIG = 0x02014b50;

/**
 * @param {Buffer} buf raw .vsix bytes
 * @returns {Map<string, Buffer>} entry path -> contents
 */
function readVsix(buf) {
  const eocd = buf.lastIndexOf(EOCD_SIG);
  if (eocd < 0) throw new Error("Not a zip: no end-of-central-directory record");

  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = new Map();

  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== CDIR_SIG) {
      throw new Error(`Corrupt zip: bad central-directory entry ${i} at ${p}`);
    }
    const method = buf.readUInt16LE(p + 10);
    // Sizes come from the central directory, not the local header: with a data
    // descriptor (general-purpose bit 3) the local header carries zeroes.
    const compressed = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const offset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);

    const dataStart =
      offset + 30 + buf.readUInt16LE(offset + 26) + buf.readUInt16LE(offset + 28);
    const raw = buf.subarray(dataStart, dataStart + compressed);
    if (method === 0) entries.set(name, raw);
    else if (method === 8) entries.set(name, zlib.inflateRawSync(raw));
    else throw new Error(`Unsupported zip compression method ${method} for ${name}`);

    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/** Read entries as UTF-8 text, failing loudly if any are absent. */
function readVsixText(buf, wanted) {
  const entries = readVsix(buf);
  const missing = wanted.filter((w) => !entries.has(w));
  if (missing.length) throw new Error("VSIX is missing entries:\n" + missing.join("\n"));
  return Object.fromEntries(wanted.map((w) => [w, entries.get(w).toString("utf8")]));
}

module.exports = { readVsix, readVsixText };
