export interface SlashCmd {
  name: string;
  description?: string;
  input?: { hint?: string };
}

/**
 * Given the current composer text and cursor position, return the slash-command query
 * (the chars after `/` on the line that the caret is in) or `null` if no popover is active.
 *
 * The popover activates only when `/` is at the start of the line or after a newline.
 */
export function getSlashQuery(text: string, caret: number): string | null {
  const before = text.slice(0, caret);
  const m = before.match(/(?:^|\n)\/(\S*)$/);
  return m ? m[1] : null;
}

/** Strip a leading `/` grok sometimes includes in advertised names. */
export function normalizeSlashName(name: string): string {
  return String(name || "").replace(/^\//, "");
}

export function normalizeAvailableCommands(commands: SlashCmd[]): SlashCmd[] {
  return (commands || [])
    .map((c) => ({ ...c, name: normalizeSlashName(c.name) }))
    .filter((c) => c.name.length > 0);
}

export function filterCommands(commands: SlashCmd[], query: string): SlashCmd[] {
  const q = query.toLowerCase().replace(/^\//, "");
  const list = commands || [];
  if (!q) return list;
  const prefix = list.filter((c) => normalizeSlashName(c.name).toLowerCase().startsWith(q));
  if (prefix.length) return prefix;
  return list.filter((c) => normalizeSlashName(c.name).toLowerCase().includes(q));
}

const SLASH_NAME_RE = /^\/([A-Za-z][\w-]*(?::[\w-]+)?)(?:\s|$)/;

/** Canonical command name (`compact`, `user:commit`) or null if this is not a slash prompt. */
export function slashCommandName(text: string): string | null {
  const m = text.trim().match(SLASH_NAME_RE);
  return m ? m[1].toLowerCase() : null;
}

/**
 * True when the whole prompt is a grok slash command (`/compact`, `/imagine …`).
 * grok only intercepts these when the ACP text block *starts* with `/name`.
 * Windows paths like `/C:/Users/…` are not commands.
 */
export function isSlashCommandText(text: string): boolean {
  return slashCommandName(text) != null;
}

/** `/imagine` and `/imagine-video` may carry a reference image; other slash cmds must not. */
export function slashCommandAllowsImages(text: string): boolean {
  const name = slashCommandName(text);
  return name === "imagine" || name === "imagine-video";
}

/** Replace the partial `/q` token with `/<name> ` and return the new text + caret. */
export function applySlashPick(
  text: string,
  caret: number,
  name: string,
): { text: string; caret: number } {
  const before = text.slice(0, caret);
  const after = text.slice(caret);
  const cmd = normalizeSlashName(name);
  const newBefore = before.replace(/(?:^|\n)\/(\S*)$/, (m) =>
    m.startsWith("\n") ? `\n/${cmd} ` : `/${cmd} `,
  );
  return { text: newBefore + after, caret: newBefore.length };
}
