import { describe, it, expect } from "vitest";
import {
  parseFileRef,
  shouldReadFileInline,
  MAX_INLINE_CHIP_BYTES,
  normalizeAttachPath,
  mimeToImageExt,
} from "../src/file-ref";

describe("parseFileRef", () => {
  it("returns the bare path when there is no line suffix", () => {
    expect(parseFileRef("src/a.ts")).toEqual({ path: "src/a.ts" });
  });

  it("parses a single-line suffix", () => {
    expect(parseFileRef("src/a.ts#L10")).toEqual({ path: "src/a.ts", startLine: 10 });
  });

  it("parses a range suffix, with or without the second L", () => {
    expect(parseFileRef("src/a.ts#L10-L20")).toEqual({ path: "src/a.ts", startLine: 10, endLine: 20 });
    expect(parseFileRef("src/a.ts#L10-20")).toEqual({ path: "src/a.ts", startLine: 10, endLine: 20 });
  });

  // The bug: a `#` earlier in the path (C#/F# folders) must not break parsing.
  it("keeps a literal # in the path when there is no line suffix", () => {
    expect(parseFileRef("C#/foo.ts")).toEqual({ path: "C#/foo.ts" });
  });

  it("separates a literal # in the path from a trailing line suffix", () => {
    // Pre-fix this fell through to the whole string and opened `foo.ts#L10`.
    expect(parseFileRef("C#/foo.ts#L10")).toEqual({ path: "C#/foo.ts", startLine: 10 });
    expect(parseFileRef("F#/Program.fs#L5-L8")).toEqual({ path: "F#/Program.fs", startLine: 5, endLine: 8 });
  });

  it("handles Windows paths with a # folder", () => {
    expect(parseFileRef("C:\\proj\\C#\\a.cs#L3")).toEqual({ path: "C:\\proj\\C#\\a.cs", startLine: 3 });
  });
});

describe("shouldReadFileInline", () => {
  it("allows files up to the threshold", () => {
    expect(shouldReadFileInline(0)).toBe(true);
    expect(shouldReadFileInline(MAX_INLINE_CHIP_BYTES)).toBe(true);
  });

  it("rejects files larger than the threshold", () => {
    expect(shouldReadFileInline(MAX_INLINE_CHIP_BYTES + 1)).toBe(false);
    expect(shouldReadFileInline(500 * 1024 * 1024)).toBe(false);
  });
});

describe("normalizeAttachPath (Windows drop bug)", () => {
  it("converts file:///C:/... and /C:/... forms to a real Windows path", () => {
    expect(normalizeAttachPath("file:///C:/Users/me/shot.png", "win32")).toBe(
      "C:\\Users\\me\\shot.png",
    );
    expect(normalizeAttachPath("/C:/Users/me/shot.png", "win32")).toBe(
      "C:\\Users\\me\\shot.png",
    );
    expect(normalizeAttachPath("C:/Users/me/shot.png", "win32")).toBe(
      "C:\\Users\\me\\shot.png",
    );
  });

  it("leaves POSIX paths alone on non-Windows", () => {
    expect(normalizeAttachPath("file:///home/me/shot.png", "linux")).toBe(
      "/home/me/shot.png",
    );
    expect(normalizeAttachPath("/home/me/shot.png", "linux")).toBe(
      "/home/me/shot.png",
    );
  });

  it("strips wrapping quotes", () => {
    expect(normalizeAttachPath('"C:\\Users\\me\\a.png"', "win32")).toBe(
      "C:\\Users\\me\\a.png",
    );
  });
});

describe("mimeToImageExt", () => {
  it("maps common image MIME types", () => {
    expect(mimeToImageExt("image/png")).toBe(".png");
    expect(mimeToImageExt("image/jpeg")).toBe(".jpg");
    expect(mimeToImageExt("image/webp")).toBe(".webp");
    expect(mimeToImageExt("unknown")).toBe(".png");
  });
});
