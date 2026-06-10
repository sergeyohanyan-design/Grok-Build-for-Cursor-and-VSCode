import { describe, it, expect } from "vitest";
import { GROK_PRIMER, PRIMER_MARKER, isPrimerText } from "../src/grok-primer";

describe("isPrimerText (host-side replay detection)", () => {
  it("matches the current primer message", () => {
    expect(isPrimerText(GROK_PRIMER)).toBe(true);
    expect(isPrimerText(PRIMER_MARKER)).toBe(true);
  });

  it("matches any primer version (v1, v2, … v17) for forward/back compat", () => {
    expect(isPrimerText("[grok-build-vscode primer v1]\n\nold")).toBe(true);
    expect(isPrimerText("[grok-build-vscode primer v2] whatever")).toBe(true);
    expect(isPrimerText("[grok-build-gui primer v4] legacy")).toBe(true);
    expect(isPrimerText("[grok-build-gui primer v5] current")).toBe(true);
    expect(isPrimerText("[grok-build-vscode primer v17] some future primer")).toBe(true);
  });

  it("tolerates leading whitespace (chunked replay can prepend a newline)", () => {
    expect(isPrimerText("\n  [grok-build-vscode primer v3] body")).toBe(true);
  });

  it("does not match a normal user message", () => {
    expect(isPrimerText("implement the login form")).toBe(false);
    expect(isPrimerText("")).toBe(false);
    expect(isPrimerText(undefined as unknown as string)).toBe(false);
  });

  it("only matches the marker at the START — a marker pasted mid-message is not a primer", () => {
    // A user who pastes the marker into the middle of their own text must still
    // get a real bubble; the primer is only ever at position 0 of a replayed msg.
    expect(isPrimerText("here is what I copied: [grok-build-vscode primer v3]")).toBe(false);
  });

  it("does not match a near-miss marker (wrong name / no version)", () => {
    expect(isPrimerText("[grok-build-vscode primer]")).toBe(false);
    expect(isPrimerText("[some-other primer v3]")).toBe(false);
  });
});
