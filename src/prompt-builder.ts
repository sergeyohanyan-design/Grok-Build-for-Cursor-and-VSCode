import type { FileChip } from "./chips";

export interface PromptBuilderDeps {
  readFile: (path: string) => string;
  extName: (path: string) => string;
}

/** Extra deps for multi-block prompts that embed image bytes. */
export interface PromptBlocksDeps extends PromptBuilderDeps {
  /** Return base64 (no data: prefix) for a file. */
  readFileBase64: (path: string) => string;
  /** Optional size guard; if missing, images are always attempted. */
  fileSize?: (path: string) => number;
}

/** ACP content blocks we send on session/prompt. */
export type PromptContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; mimeType: string; data: string; uri?: string };

/** Soft cap for a single vision attachment (decoded bytes). */
export const MAX_VISION_IMAGE_BYTES = 12 * 1024 * 1024;

const IMAGE_EXT_RE = /^\.(png|jpe?g|gif|webp|bmp|svg)$/i;

export function isImageFilePath(filePath: string, extName: (p: string) => string): boolean {
  const ext = extName(filePath) || "";
  if (IMAGE_EXT_RE.test(ext)) return true;
  // Fallback: path may lack a clean ext via extName
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(filePath);
}

export function mimeFromImagePath(filePath: string): string {
  const m = filePath.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = m?.[1] || "png";
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "bmp":
      return "image/bmp";
    case "svg":
      return "image/svg+xml";
    case "png":
    default:
      return "image/png";
  }
}

/**
 * Build the final prompt text from a typed message + active chips.
 *
 * - Hidden chips are skipped.
 * - A chip with a selection range becomes a fenced code block of those lines.
 * - A chip without a range becomes an `@relPath` reference.
 * - The user's text follows after a blank line.
 *
 * Note: image chips are only `@path` here. Prefer {@link buildPromptBlocks}
 * for real screenshot vision (ACP image content blocks).
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

export interface BuildPromptBlocksResult {
  blocks: PromptContentBlock[];
  imageCount: number;
  warnings: string[];
}

/**
 * Build ACP content blocks: image chips become real `image` blocks (base64),
 * other chips stay as text `@refs` / fenced selections, then the user text.
 *
 * Order: all images first, then a single trailing text block (ACP clients
 * commonly put media before instructions).
 *
 * grok agent stdio still advertises `promptCapabilities.image:false` but
 * accepts image blocks in practice (probed 2026-07-10 on grok 0.2.93).
 */
export function buildPromptBlocks(
  text: string,
  chips: FileChip[],
  deps: PromptBlocksDeps,
): BuildPromptBlocksResult {
  const images: PromptContentBlock[] = [];
  const refs: string[] = [];
  const warnings: string[] = [];

  for (const chip of chips) {
    if (chip.hidden) continue;

    // Selection on an image is rare; treat selection as text when present.
    const asImage =
      isImageFilePath(chip.path, deps.extName) &&
      !(chip.selectionStart && chip.selectionEnd);

    if (asImage) {
      try {
        const size = deps.fileSize?.(chip.path);
        if (size != null && size > MAX_VISION_IMAGE_BYTES) {
          warnings.push(
            `${chip.relPath} is too large for vision (>${Math.round(MAX_VISION_IMAGE_BYTES / (1024 * 1024))}MB); attaching as path only`,
          );
          refs.push(`@${chip.relPath}`);
          continue;
        }
        if (size != null && size > 0 && size < 64) {
          // Tiny files are often corrupt; still try but note min vision size ~8x8
        }
        const data = deps.readFileBase64(chip.path);
        if (!data) {
          warnings.push(`${chip.relPath}: empty image data`);
          refs.push(`@${chip.relPath}`);
          continue;
        }
        images.push({
          type: "image",
          mimeType: mimeFromImagePath(chip.path),
          data,
        });
        refs.push(`[Attached screenshot: ${chip.relPath}]`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        warnings.push(`${chip.relPath}: ${msg}`);
        refs.push(`@${chip.relPath}`);
      }
      continue;
    }

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

  const textBody = [refs.join("\n\n"), text].filter(Boolean).join("\n\n");
  const blocks: PromptContentBlock[] = [...images];
  if (textBody) {
    blocks.push({ type: "text", text: textBody });
  } else if (blocks.length === 0) {
    blocks.push({ type: "text", text: "" });
  }

  return { blocks, imageCount: images.length, warnings };
}
