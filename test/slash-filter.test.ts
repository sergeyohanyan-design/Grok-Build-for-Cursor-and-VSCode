import { describe, it, expect } from "vitest";
import { applySlashPick, filterCommands, getSlashQuery, isSlashCommandText } from "../src/slash-filter";

describe("getSlashQuery", () => {
  it("returns null when no slash at line start", () => {
    expect(getSlashQuery("hello", 5)).toBeNull();
    expect(getSlashQuery("hello /not", 10)).toBeNull();
  });

  it("returns query when slash is at start of input", () => {
    expect(getSlashQuery("/com", 4)).toBe("com");
  });

  it("returns query when slash is at start of new line", () => {
    expect(getSlashQuery("hi\n/pla", 7)).toBe("pla");
  });

  it("ignores text after the caret", () => {
    expect(getSlashQuery("/co  more", 3)).toBe("co");
  });

  it("returns empty string for bare `/`", () => {
    expect(getSlashQuery("/", 1)).toBe("");
  });
});

describe("filterCommands", () => {
  const cmds = [
    { name: "compact", description: "Compress conversation" },
    { name: "clear", description: "" },
    { name: "context", description: "Show context" },
    { name: "yolo", description: "Toggle auto-approve" },
  ];

  it("empty query returns all", () => {
    expect(filterCommands(cmds, "")).toEqual(cmds);
  });

  it("filters by prefix", () => {
    expect(filterCommands(cmds, "co").map((c) => c.name)).toEqual([
      "compact",
      "context",
    ]);
  });

  it("is case-insensitive", () => {
    expect(filterCommands(cmds, "CO").map((c) => c.name)).toEqual([
      "compact",
      "context",
    ]);
  });

  it("returns empty when no matches", () => {
    expect(filterCommands(cmds, "zzz")).toEqual([]);
  });
});

describe("isSlashCommandText", () => {
  it("matches builtins and skills with optional args", () => {
    expect(isSlashCommandText("/compact")).toBe(true);
    expect(isSlashCommandText("  /compact  ")).toBe(true);
    expect(isSlashCommandText("/compact keep the auth")).toBe(true);
    expect(isSlashCommandText("/session-info")).toBe(true);
    expect(isSlashCommandText("/imagine a cat")).toBe(true);
    expect(isSlashCommandText("/user:commit")).toBe(true);
  });

  it("rejects normal prompts and Windows paths", () => {
    expect(isSlashCommandText("compact")).toBe(false);
    expect(isSlashCommandText("please /compact this")).toBe(false);
    expect(isSlashCommandText("/C:/Users/me/file.ts")).toBe(false);
    expect(isSlashCommandText("")).toBe(false);
  });
});

describe("applySlashPick", () => {
  it("replaces the partial /q with /name and trailing space", () => {
    const r = applySlashPick("/com", 4, "compact");
    expect(r.text).toBe("/compact ");
    expect(r.caret).toBe(9);
  });

  it("preserves text after caret", () => {
    const r = applySlashPick("/co rest", 3, "compact");
    expect(r.text).toBe("/compact  rest");
    expect(r.caret).toBe(9);
  });

  it("works at start of new line", () => {
    const r = applySlashPick("hi\n/pla", 7, "plan");
    expect(r.text).toBe("hi\n/plan ");
    expect(r.caret).toBe(9);
  });
});
