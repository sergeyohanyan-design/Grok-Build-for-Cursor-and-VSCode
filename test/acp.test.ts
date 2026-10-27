import { describe, it, expect, vi } from "vitest";
import { AcpClient, buildGrokAgentArgs } from "../src/acp";

// Unit tests for AcpClient internals that don't need a real subprocess. We
// stand up the client with a fake writable proc and drive `request`/`onLine`
// directly.
function clientWithFakeProc(): { client: AcpClient; written: string[] } {
  const client = new AcpClient({ cliPath: "x", cwd: "/", log: () => {} });
  const written: string[] = [];
  (client as any).proc = {
    killed: false,
    stdin: { writable: true, write: (s: string) => written.push(s) },
  };
  return { client, written };
}

describe("AcpClient.request timer lifecycle", () => {
  it("clears the per-request timeout when the response arrives (no leaked timer)", async () => {
    vi.useFakeTimers();
    try {
      const { client } = clientWithFakeProc();
      const before = vi.getTimerCount();

      const p = (client as any).request("session/set_mode", { modeId: "plan" }); // id = 1
      expect(vi.getTimerCount()).toBe(before + 1); // timeout armed

      (client as any).onLine(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { ok: true } }));
      await p;

      expect(vi.getTimerCount()).toBe(before); // timeout cleared on response
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps a long session/prompt alive while ACP updates continue", async () => {
    vi.useFakeTimers();
    try {
      const { client } = clientWithFakeProc();
      let settled = false;
      const p = (client as any).request("session/prompt", { sessionId: "s", prompt: [] });
      void p.then(() => { settled = true; }, () => { settled = true; });

      await vi.advanceTimersByTimeAsync(1_700_000);
      (client as any).onLine(JSON.stringify({
        jsonrpc: "2.0",
        method: "session/update",
        params: { update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "still working" } } },
      }));
      await vi.advanceTimersByTimeAsync(200_000);
      expect(settled).toBe(false);

      (client as any).onLine(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { stopReason: "end_turn" } }));
      await p;
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("still times out a silent session/prompt", async () => {
    vi.useFakeTimers();
    try {
      const { client } = clientWithFakeProc();
      const p = (client as any).request("session/prompt", { sessionId: "s", prompt: [] });
      const timedOut = expect(p).rejects.toThrow("ACP request timed out: session/prompt");
      await vi.advanceTimersByTimeAsync(1_800_000);
      await timedOut;
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the 24-hour absolute cap even when updates continue", async () => {
    vi.useFakeTimers();
    try {
      const { client } = clientWithFakeProc();
      const p = (client as any).request("session/prompt", { sessionId: "s", prompt: [] });
      const timedOut = expect(p).rejects.toThrow("ACP request timed out: session/prompt");

      for (let interval = 0; interval < 95; interval += 1) {
        await vi.advanceTimersByTimeAsync(900_000);
        (client as any).onLine(JSON.stringify({
          jsonrpc: "2.0",
          method: "session/update",
          params: { update: { sessionUpdate: "agent_thought_chunk", content: { type: "text", text: "." } } },
        }));
      }
      await vi.advanceTimersByTimeAsync(900_000);
      await timedOut;
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

// #3/#4 (thanks @shugav for the crash report): the startup crash was the bogus
// `max` value, not reasoningEffort itself — grok accepts none|minimal|low|medium|
// high|xhigh, and the flag must precede the `stdio` subcommand.
describe("buildGrokAgentArgs", () => {
  it("starts ACP sessions with the stdio subcommand when no effort is set", () => {
    expect(buildGrokAgentArgs()).toEqual(["agent", "stdio"]);
  });

  it("forwards a valid effort as --reasoning-effort before the stdio subcommand", () => {
    expect(buildGrokAgentArgs("high")).toEqual(["agent", "--reasoning-effort", "high", "stdio"]);
    expect(buildGrokAgentArgs("none")).toEqual(["agent", "--reasoning-effort", "none", "stdio"]);
    expect(buildGrokAgentArgs("xhigh")).toEqual(["agent", "--reasoning-effort", "xhigh", "stdio"]);
  });
});
