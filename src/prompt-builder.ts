import type { FileChip } from "./chips";

export interface PromptBuilderDeps {
  readFile: (path: string) => string;
  extName: (path: string) => string;
}

/**
 * Build the final prompt text from a typed message + active chips.
 *
 * - Hidden chips are skipped.
 * - A chip with a selection range becomes a fenced code block of those lines.
 * - A chip without a range becomes an `@relPath` reference.
 * - The user's text follows after a blank line.
 */
export function buildPrompt(
  text: string,
  chips: FileChip[],
  deps: PromptBuilderDeps,
): string {
  const refs: string[] = [];
  for (const chip of chips) {
    if (chip.hidden) continue;
    if (chip.selectionStart && chip.selectionEnd) {
      let content = "";
      try {
        content = deps.readFile(chip.path);
      } catch {
        refs.push(`@${chip.relPath}`);
        continue;
      }
      const lines = content
        .split("\n")
        .slice(chip.selectionStart - 1, chip.selectionEnd);
      const ext = deps.extName(chip.path).replace(/^\./, "");
      refs.push(
        `\`${chip.relPath}\` (lines ${chip.selectionStart}-${chip.selectionEnd}):\n\`\`\`${ext}\n${lines.join("\n")}\n\`\`\``,
      );
    } else {
      refs.push(`@${chip.relPath}`);
    }
  }
  return [refs.join("\n\n"), text].filter(Boolean).join("\n\n");
}
