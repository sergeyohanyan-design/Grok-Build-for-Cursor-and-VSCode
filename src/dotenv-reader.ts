import * as fs from "node:fs";
import * as path from "node:path";

/** Parse optional workspace .env into a plain map (no process.env merge). */
export function readWorkspaceDotEnv(cwd: string): Record<string, string> {
  const dotEnv: Record<string, string> = {};
  try {
    const content = fs.readFileSync(path.join(cwd, ".env"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key) dotEnv[key] = val;
    }
  } catch { /* optional env file missing */ }
  return dotEnv;
}