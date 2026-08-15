import { describe, it, expect } from "vitest";
import {
  buildPrompt,
  buildPromptBlocks,
  isImageFilePath,
  mimeFromImagePath,
  MAX_VISION_IMAGE_BYTES,
} from "../src/prompt-builder";
import { makeImplicitChip, makeExplicitChip } from "../src/chips";

const deps = {
  readFile: (p: string) => {
    if (p === "/a.ts") return "line1\nline2\nline3\nline4\nline5";
    if (p === "/b.ts") return "X\nY";
    throw new Error("ENOENT " + p);
  },
  extName: (p: string) => {
    const i = p.lastIndexOf(".");
    return i >= 0 ? p.slice(i) : "";
  },
};

const blockDeps = {
  ...deps,
  readFileBase64: (p: string) => {
    if (p === "/shot.png") return "iVBOR-fake-png-b64";
    if (p === "/photo.jpg") return "jpeg-fake-b64";
    throw new Error("ENOENT " + p);
  },
  fileSize: (p: string) => {
    if (p === "/shot.png") return 1200;
    if (p === "/photo.jpg") return 800;
    if (p === "/huge.png") return MAX_VISION_IMAGE_BYTES + 1;
    return 0;
  },
};

describe("buildPrompt", () => {
  it("returns just the text when no chips", () => {
    expect(buildPrompt("hello", [], deps)).toBe("hello");
  });

  it("renders a file-only chip as @ref", () => {
    const out = buildPrompt("explain this", [makeImplicitChip("/a.ts", "src/a.ts")], deps);
    expect(out).toBe("@src/a.ts\n\nexplain this");
  });

  it("renders a selection chip as fenced code", () => {
    const chip = makeExplicitChip("/a.ts", "src/a.ts", 2, 4);
    const out = buildPrompt("what is this", [chip], deps);
    expect(out).toBe(
      "`src/a.ts` (lines 2-4):\n```ts\nline2\nline3\nline4\n```\n\nwhat is this",
    );
  });

  it("skips hidden chips", () => {
    const visible = makeImplicitChip("/a.ts", "a.ts");
    const hidden = { ...makeImplicitChip("/b.ts", "b.ts"), hidden: true };
    expect(buildPrompt("q", [visible, hidden], deps)).toBe("@a.ts\n\nq");
  });

  it("falls back to @ref when readFile throws", () => {
    const chip = makeExplicitChip("/missing.ts", "missing.ts", 1, 5);
    expect(buildPrompt("q", [chip], deps)).toBe("@missing.ts\n\nq");
  });

  it("combines multiple chips", () => {
    const a = makeImplicitChip("/a.ts", "a.ts");
    const b = makeExplicitChip("/b.ts", "b.ts", 1, 2);
    const out = buildPrompt("compare", [a, b], deps);
    expect(out).toBe(
      "@a.ts\n\n`b.ts` (lines 1-2):\n```ts\nX\nY\n```\n\ncompare",
    );
  });

  it("uses empty fence language when no extension", () => {
    const chip = makeExplicitChip("/Makefile", "Makefile", 1, 1);
    const out = buildPrompt("", [chip], {
      readFile: () => "all:\n\techo",
      extName: () => "",
    });
    expect(out).toContain("```\nall:");
  });
});

describe("isImageFilePath / mimeFromImagePath", () => {
  it("detects image extensions", () => {
    expect(isImageFilePath("/a.png", (p) => ".png")).toBe(true);
    expect(isImageFilePath("/a.JPG", (p) => ".JPG")).toBe(true);
    expect(isImageFilePath("/a.ts", (p) => ".ts")).toBe(false);
  });

  it("maps mime types", () => {
    expect(mimeFromImagePath("/x.png")).toBe("image/png");
    expect(mimeFromImagePath("/x.jpeg")).toBe("image/jpeg");
    expect(mimeFromImagePath("/x.webp")).toBe("image/webp");
  });
});

describe("buildPromptBlocks (vision)", () => {
  it("embeds image chips as ACP image blocks before text", () => {
    const img = makeExplicitChip("/shot.png", "shot.png");
    const code = makeImplicitChip("/a.ts", "src/a.ts");
    const { blocks, imageCount, warnings } = buildPromptBlocks(
      "what is wrong here?",
      [img, code],
      blockDeps,
    );
    expect(imageCount).toBe(1);
    expect(warnings).toEqual([]);
    expect(blocks[0]).toEqual({
      type: "image",
      mimeType: "image/png",
      data: "iVBOR-fake-png-b64",
    });
    expect(blocks[1]?.type).toBe("text");
    expect((blocks[1] as { text: string }).text).toContain("[Attached screenshot: shot.png]");
    expect((blocks[1] as { text: string }).text).toContain("@src/a.ts");
    expect((blocks[1] as { text: string }).text).toContain("what is wrong here?");
  });

  it("falls back to @path when image is too large", () => {
    const huge = makeExplicitChip("/huge.png", "huge.png");
    const { blocks, imageCount, warnings } = buildPromptBlocks("q", [huge], {
      ...blockDeps,
      readFileBase64: () => "should-not-be-used",
      fileSize: () => MAX_VISION_IMAGE_BYTES + 1,
    });
    expect(imageCount).toBe(0);
    expect(warnings[0]).toMatch(/too large/);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ type: "text", text: "@huge.png\n\nq" });
  });

  it("text-only chips produce a single text block", () => {
    const a = makeImplicitChip("/a.ts", "a.ts");
    const { blocks, imageCount } = buildPromptBlocks("hello", [a], blockDeps);
    expect(imageCount).toBe(0);
    expect(blocks).toEqual([{ type: "text", text: "@a.ts\n\nhello" }]);
  });
});
