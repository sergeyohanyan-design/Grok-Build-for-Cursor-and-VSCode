import { describe, expect, it } from "vitest";
import { promptTimerDelayMs } from "../src/acp-timeout";

describe("promptTimerDelayMs", () => {
  it("uses the shorter of the idle and absolute deadlines", () => {
    expect(promptTimerDelayMs({
      startedAt: 0,
      lastActivityAt: 9_000,
      now: 10_000,
      idleMs: 5_000,
      absoluteMs: 12_000,
    })).toBe(2_000);
  });

  it("lets recent activity extend only the idle deadline", () => {
    expect(promptTimerDelayMs({
      startedAt: 0,
      lastActivityAt: 9_000,
      now: 10_000,
      idleMs: 5_000,
      absoluteMs: 60_000,
    })).toBe(4_000);
  });
});
