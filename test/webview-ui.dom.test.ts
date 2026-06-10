// DOM-level regression tests for the webview UI bugs that the native-Windows
// smoke test surfaced and this build fixed (see CLAUDE.md § Status). Each one
// drives the REAL media/chat.js and asserts the fixed behavior, so the bug can't
// silently come back:
//
//   1. History popover that "never closed"  -> open/close toggle + outside-click close
//   2. Session rows "only clickable on the label" -> whole row resumes; action
//      buttons stopPropagation so they don't also resume
//   3. Reasoning traces "no longer expandable" -> header click toggles the body
import { describe, it, expect } from "vitest";
import { bootWebview, dispatch, click, Posted } from "./webview-harness";

const $ = (doc: Document, id: string) => doc.getElementById(id) as HTMLElement;
const types = (posted: Posted[]) => posted.map((p) => p.type);

describe("history popover (regression: popover that never closed)", () => {
  it("opens on the history button and requests the session list", () => {
    const { window, posted, doc } = bootWebview();
    const pop = $(doc, "history-popover");
    expect((pop as any).hidden).toBe(true);

    click(window, $(doc, "history-btn"));

    expect((pop as any).hidden).toBe(false);
    expect(types(posted)).toContain("listSessions");
  });

  it("toggles closed when the history button is clicked again", () => {
    const { window, doc } = bootWebview();
    const pop = $(doc, "history-popover");
    click(window, $(doc, "history-btn"));
    expect((pop as any).hidden).toBe(false);

    click(window, $(doc, "history-btn"));
    expect((pop as any).hidden).toBe(true);
  });

  it("closes on an outside click but stays open on a click inside it", () => {
    const { window, doc } = bootWebview();
    const pop = $(doc, "history-popover");

    click(window, $(doc, "history-btn"));
    expect((pop as any).hidden).toBe(false);

    // click inside the popover -> stopPropagation keeps it open
    click(window, pop);
    expect((pop as any).hidden).toBe(false);

    // click elsewhere in the document -> closePopovers()
    click(window, $(doc, "messages"));
    expect((pop as any).hidden).toBe(true);
  });
});

describe("session rows (regression: only the label was clickable)", () => {
  const entries = [
    { id: "s1", displayName: "Add subtract fn", numMessages: 4, updatedAt: Date.now() - 60000 },
    { id: "s2", displayName: "Refactor parser", numMessages: 9, updatedAt: Date.now() - 3600000 },
  ];

  function openWithSessions() {
    const h = bootWebview();
    click(h.window, $(h.doc, "history-btn")); // open the popover so the list renders
    h.posted.length = 0; // forget the listSessions request; keep only row interactions
    dispatch(h.window, { type: "sessions", entries, activeId: null });
    return h;
  }

  it("renders one row per session with name + meta", () => {
    const { doc } = openWithSessions();
    const rows = doc.querySelectorAll(".history-row");
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector(".history-row-name")!.textContent).toBe("Add subtract fn");
    expect(rows[0].querySelector(".history-row-meta")!.textContent).toContain("4 msg");
  });

  it("resumes the session when the row's META area (not the label) is clicked", () => {
    const { window, posted, doc } = openWithSessions();
    const meta = doc.querySelector(".history-row .history-row-meta") as HTMLElement;
    click(window, meta); // a non-label part of the row

    expect(posted).toContainEqual({ type: "resumeSession", id: "s1" });
  });

  it("delete button posts deleteSession and does NOT also resume (stopPropagation)", () => {
    const { window, posted, doc } = openWithSessions();
    const delBtn = doc.querySelector(".history-row .history-action-danger") as HTMLElement;
    click(window, delBtn);

    expect(posted).toContainEqual({ type: "deleteSession", id: "s1", name: "Add subtract fn" });
    expect(types(posted)).not.toContain("resumeSession");
  });

  it("hides the delete button for the active session, keeps it for others", () => {
    const h = bootWebview();
    click(h.window, $(h.doc, "history-btn"));
    h.posted.length = 0;
    dispatch(h.window, { type: "sessions", entries, activeId: "s1" });
    const rows = h.doc.querySelectorAll(".history-row");
    // s1 is active → no delete button (it's the live session; delete wouldn't stick).
    expect(rows[0].querySelector(".history-action-danger")).toBeNull();
    // s2 is not active → delete button present.
    expect(rows[1].querySelector(".history-action-danger")).not.toBeNull();
    // Rename stays available on the active row.
    expect(rows[0].querySelector(".history-action-btn")).not.toBeNull();
  });

  it("rename button enters rename mode and does NOT resume", () => {
    const { window, posted, doc } = openWithSessions();
    const renameBtn = doc.querySelectorAll(".history-row .history-action-btn")[0] as HTMLElement;
    click(window, renameBtn);

    expect(doc.querySelector(".history-row input.history-rename")).not.toBeNull();
    expect(types(posted)).not.toContain("resumeSession");
  });
});

describe("mode picker (the plan-gate entry path)", () => {
  it("offers Agent / Plan / YOLO and posts setMode with the chosen mode id", () => {
    const { window, posted, doc } = bootWebview();
    const pop = $(doc, "mode-popover");

    click(window, $(doc, "mode-btn"));
    expect((pop as any).hidden).toBe(false);
    const labels = [...pop.querySelectorAll(".mode-item-label")].map((l) => l.textContent);
    expect(labels).toEqual(["Agent mode", "Plan mode", "YOLO"]);

    const planItem = [...pop.querySelectorAll(".mode-popover-item")]
      .find((el) => el.querySelector(".mode-item-label")!.textContent === "Plan mode") as HTMLElement;
    click(window, planItem);

    expect(posted).toContainEqual({ type: "setMode", modeId: "plan" });
    expect((pop as any).hidden).toBe(true); // selecting a mode closes the popover
  });

  it("toggles the mode popover closed when the button is clicked again", () => {
    const { window, doc } = bootWebview();
    const pop = $(doc, "mode-popover");
    click(window, $(doc, "mode-btn"));
    expect((pop as any).hidden).toBe(false);
    click(window, $(doc, "mode-btn"));
    expect((pop as any).hidden).toBe(true);
  });
});

describe("add context popover", () => {
  it("opens with attach options and posts attachActiveFile", () => {
    const { window, posted, doc } = bootWebview();
    const pop = $(doc, "add-popover");
    click(window, $(doc, "add-btn"));
    expect((pop as any).hidden).toBe(false);
    expect(pop.querySelector(".popover-header-title")!.textContent).toBe("Add context");

    const active = [...pop.querySelectorAll(".context-menu-item")]
      .find((el) => el.textContent!.includes("Active editor file")) as HTMLElement;
    click(window, active);
    expect(posted).toContainEqual({ type: "attachActiveFile" });
  });

  it("posts attachActiveSelection for selected lines", () => {
    const { window, posted, doc } = bootWebview();
    click(window, $(doc, "add-btn"));
    const sel = [...$(doc, "add-popover").querySelectorAll(".context-menu-item")]
      .find((el) => el.textContent!.includes("Selected lines")) as HTMLElement;
    click(window, sel);
    expect(posted).toContainEqual({ type: "attachActiveSelection" });
  });
});

describe("header model picker", () => {
  const models = [
    { modelId: "grok-build", name: "Grok Build", totalContextTokens: 200000 },
    { modelId: "grok-composer-2.5-fast", name: "Composer 2.5 Fast", totalContextTokens: 256000 },
  ];

  it("opens with search, model cards, and effort pills", () => {
    const { window, doc } = bootWebview();
    dispatch(window, { type: "session", sessionId: "s1", models, currentModelId: "grok-build" });
    click(window, $(doc, "model-btn"));
    const pop = $(doc, "model-popover");
    expect((pop as any).hidden).toBe(false);
    expect(pop.querySelector(".popover-search")).not.toBeNull();
    expect(pop.querySelectorAll(".model-card")).toHaveLength(2);
    expect(pop.querySelector(".model-card.active .model-card-badge")!.textContent).toBe("Active");
    expect(pop.querySelectorAll(".effort-pill").length).toBeGreaterThan(0);
  });

  it("filters models by search and posts setModel on pick", () => {
    const { window, posted, doc } = bootWebview();
    dispatch(window, { type: "session", sessionId: "s1", models, currentModelId: "grok-build" });
    click(window, $(doc, "model-btn"));
    const search = $(doc, "model-popover").querySelector(".popover-search") as HTMLInputElement;
    search.value = "composer";
    search.dispatchEvent(new (window as any).Event("input", { bubbles: true }));
    const cards = doc.querySelectorAll("#model-popover .model-card");
    expect(cards).toHaveLength(1);
    click(window, cards[0]);
    expect(posted).toContainEqual({ type: "setModel", modelId: "grok-composer-2.5-fast" });
  });
});

describe("gear settings lock (model + effort disabled while busy / priming)", () => {
  const models = [
    { modelId: "grok-build", name: "Grok Build" },
    { modelId: "grok-composer-2.5-fast", name: "Composer 2.5 Fast" },
  ];
  function bootWithModels(busy?: { value: boolean; locked?: boolean }) {
    const h = bootWebview();
    dispatch(h.window, { type: "session", sessionId: "s1", models, currentModelId: "grok-build" });
    if (busy) dispatch(h.window, { type: "setBusy", ...busy });
    h.posted.length = 0;
    return h;
  }
  const modelBtn = (doc: Document) => doc.querySelector(".model-name-btn") as HTMLButtonElement;

  it("shows the user-facing model name on the gear button, not the raw id", () => {
    const { window, doc } = bootWithModels();
    click(window, $(doc, "gear-btn"));
    expect(modelBtn(doc).textContent).toContain("Grok Build");
    expect(modelBtn(doc).textContent).not.toContain("grok-build");
  });

  it("when idle, the model button opens the picker and a pick posts setModel", () => {
    const { window, posted, doc } = bootWithModels();
    click(window, $(doc, "gear-btn"));
    expect(modelBtn(doc).disabled).toBe(false);

    click(window, modelBtn(doc)); // opens the picker sub-view
    const composer = [...doc.querySelectorAll("#gear-popover .model-card")]
      .find((el) => el.textContent!.includes("Composer 2.5 Fast")) as HTMLElement;
    click(window, composer);

    expect(posted).toContainEqual({ type: "setModel", modelId: "grok-composer-2.5-fast" });
  });

  it("while priming, the model button is disabled and clicking it neither opens the picker nor posts", () => {
    const { window, posted, doc } = bootWithModels({ value: true, locked: true });
    click(window, $(doc, "gear-btn"));

    expect(modelBtn(doc).disabled).toBe(true);
    expect(modelBtn(doc).className).toContain("disabled");

    click(window, modelBtn(doc));
    // still on the main gear view (the picker's "← Model" back row never rendered)
    expect(doc.querySelector("#gear-popover .popover-back")).toBeNull();
    expect(types(posted)).not.toContain("setModel");
  });

  it("while busy, clicking an effort dot does not post setEffort", () => {
    const { window, posted, doc } = bootWithModels({ value: true });
    click(window, $(doc, "gear-btn"));
    const dot = doc.querySelector(".effort-dot") as HTMLElement;

    expect(dot.className).toContain("disabled");
    click(window, dot);
    expect(types(posted)).not.toContain("setEffort");
  });

  it("re-renders an open gear to unlock the controls once busy clears", () => {
    const { window, doc } = bootWithModels({ value: true, locked: true });
    click(window, $(doc, "gear-btn"));
    expect(modelBtn(doc).disabled).toBe(true);

    dispatch(window, { type: "setBusy", value: false });

    expect(($(doc, "gear-popover") as any).hidden).toBe(false); // popover stays open
    expect(modelBtn(doc).disabled).toBe(false); // now unlocked
  });
});

describe("reasoning trace (regression: thinking traces no longer expandable)", () => {
  it("renders a collapsed thinking block whose header toggles the body open/closed", () => {
    const { window, doc } = bootWebview();
    dispatch(window, { type: "thoughtChunk", text: "considering the approach…" });

    const block = doc.querySelector(".msg.thinking")!;
    const hdr = block.querySelector(".thinking-header") as HTMLElement;
    const body = block.querySelector(".thinking-body") as HTMLElement;
    const chevron = block.querySelector(".thinking-chevron") as HTMLElement;

    expect(body.hidden).toBe(true);
    expect(chevron.textContent).toBe("▶");

    click(window, hdr);
    expect(body.hidden).toBe(false);
    expect(chevron.textContent).toBe("▼");

    click(window, hdr);
    expect(body.hidden).toBe(true);
    expect(chevron.textContent).toBe("▶");
  });
});

describe("user message (regression: doubled on grok 0.2.33)", () => {
  const users = (doc: Document) => doc.querySelectorAll(".msg.user");

  it("does not render a second bubble when a live prompt is echoed back as a user chunk", () => {
    const { window, doc } = bootWebview();

    // Live send: the host posts the optimistic bubble.
    dispatch(window, { type: "userMessage", text: "/imagine a rocket", chips: [] });
    expect(users(doc).length).toBe(1);

    // grok 0.2.33 echoes the prompt back as a user_message_chunk mid-turn (not
    // replaying). It must NOT spawn a duplicate bubble.
    dispatch(window, { type: "userMessageChunk", text: "/imagine a rocket" });
    expect(users(doc).length).toBe(1);
  });

  it("still renders the user bubble from chunks during a session replay", () => {
    const { window, doc } = bootWebview();

    dispatch(window, { type: "historyReplay", active: true });
    dispatch(window, { type: "userMessageChunk", text: "resumed prompt" });

    expect(users(doc).length).toBe(1);
    expect(users(doc)[0].textContent).toContain("resumed prompt");
  });
});

describe("agent pending indicator (no blank gap after send)", () => {
  it("shows user bubble and thinking animation immediately when the user sends", () => {
    const { window, doc } = bootWebview();
    const input = $(doc, "input") as HTMLTextAreaElement;
    input.value = "hello";
    input.dispatchEvent(new (window as any).Event("input", { bubbles: true }));
    click(window, $(doc, "action-btn"));
    expect(doc.querySelector(".msg.user")).not.toBeNull();
    expect(doc.querySelector(".agent-pending")).not.toBeNull();
    expect(doc.querySelector(".thinking-wave")).not.toBeNull();
  });

  it("replaces the pending indicator when thought chunks arrive", () => {
    const { window, doc } = bootWebview();
    dispatch(window, { type: "agentStart" });
    expect(doc.querySelector(".agent-pending")).not.toBeNull();
    dispatch(window, { type: "thoughtChunk", text: "planning…" });
    expect(doc.querySelector(".agent-pending")).toBeNull();
    expect(doc.querySelector(".msg.thinking")).not.toBeNull();
  });
});

describe("new session welcome restore", () => {
  it("shows the welcome icon again after new session", () => {
    const { window, doc } = bootWebview();
    dispatch(window, { type: "userMessage", text: "prior chat", chips: [] });
    expect($(doc, "welcome").classList.contains("welcome-fade-out")).toBe(true);

    click(window, $(doc, "new-btn"));
    const welcome = $(doc, "welcome");
    expect((welcome as any).hidden).toBe(false);
    expect(welcome.classList.contains("welcome-dismissed")).toBe(false);
    expect(doc.querySelector(".grok-mark-svg, .welcome-mark svg")).not.toBeNull();
    expect(doc.querySelector(".agent-pending")).toBeNull();
  });
});

describe("welcome screen (session-start lifecycle)", () => {
  const verEl = (doc: Document) => $(doc, "welcome-version");
  const ver = (doc: Document) => verEl(doc).textContent;
  const welcome = (doc: Document) => $(doc, "welcome");
  // The trailing dots are an animated ::after pseudo-element (the .loading-dots
  // class), so the literal text is dot-free while a status is transient.
  const animating = (doc: Document) => verEl(doc).classList.contains("loading-dots");

  it("stays visible after session ready until the first user message", () => {
    const { window, doc } = bootWebview();

    dispatch(window, { type: "initialized", info: { version: "0.2.33" } });
    expect(ver(doc)).toBe("Starting");
    expect((welcome(doc) as any).hidden).toBe(false);

    dispatch(window, { type: "setBusy", value: false });
    expect((welcome(doc) as any).hidden).toBe(false);
    expect($(doc, "welcome-loader").classList.contains("ready")).toBe(true);

    dispatch(window, { type: "userMessage", text: "hello", chips: [] });
    expect(welcome(doc).classList.contains("welcome-fade-out")).toBe(true);
  });

  it("shows Updating Grok Build CLI then keeps welcome until first chat", () => {
    const { window, doc } = bootWebview();

    dispatch(window, { type: "cliUpdating" });
    expect(ver(doc)).toBe("Updating Grok Build CLI");

    dispatch(window, { type: "initialized", info: { version: "0.2.40" } });
    dispatch(window, { type: "setBusy", value: false });
    expect((welcome(doc) as any).hidden).toBe(false);
    expect(ver(doc)).not.toContain("Connected");
  });

  it("does not dismiss welcome on later busy toggles without a user message", () => {
    const { window, doc } = bootWebview();
    dispatch(window, { type: "initialized", info: { version: "0.2.33" } });
    dispatch(window, { type: "setBusy", value: false });
    expect((welcome(doc) as any).hidden).toBe(false);

    dispatch(window, { type: "setBusy", value: true });
    dispatch(window, { type: "setBusy", value: false });
    expect((welcome(doc) as any).hidden).toBe(false);
  });
});

describe("gear menu — Other group + About / Config & debug sub-views", () => {
  function boot() {
    const h = bootWebview();
    dispatch(h.window, { type: "initialState", useCtrlEnter: false, effort: "", cwd: "/x", extVersion: "1.0.0" });
    dispatch(h.window, { type: "initialized", info: { version: "0.2.33" } });
    dispatch(h.window, { type: "session", sessionId: "s1", models: [], currentModelId: "grok-build" });
    h.posted.length = 0;
    return h;
  }
  const gear = (doc: Document) => $(doc, "gear-popover");
  const items = (doc: Document) => [...doc.querySelectorAll("#gear-popover .toolbar-popover-item")] as HTMLElement[];
  const itemByText = (doc: Document, text: string) =>
    items(doc).find((el) => el.textContent!.includes(text)) as HTMLElement;

  it("replaces the flat Config/Account/Debug sections with an Other group", () => {
    const h = boot();
    click(h.window, $(h.doc, "gear-btn"));
    const labels = items(h.doc).map((el) => el.textContent || "");
    expect(labels.some((l) => l.includes("About"))).toBe(true);
    expect(labels.some((l) => l.includes("Config & debug"))).toBe(true);
    expect(labels.some((l) => l.includes("Log out"))).toBe(true);
    // the old standalone items no longer live on the main view
    expect(labels.some((l) => l.trim() === "Sign out")).toBe(false);
    expect(labels.some((l) => l.includes("Show extension logs"))).toBe(false);
  });

  it("About shows both versions and requests an update check", () => {
    const h = boot();
    click(h.window, $(h.doc, "gear-btn"));
    click(h.window, itemByText(h.doc, "About"));

    const text = gear(h.doc).textContent || "";
    expect(text).toContain("This extension");
    expect(text).toContain("v1.0.0");
    expect(text).toContain("Grok Build CLI");
    expect(text).toContain("v0.2.33");
    expect(types(h.posted)).toContain("checkGrokUpdate");
  });

  it("enables Update Grok Build when an update is available and posts updateGrok", () => {
    const h = boot();
    click(h.window, $(h.doc, "gear-btn"));
    click(h.window, itemByText(h.doc, "About"));
    dispatch(h.window, { type: "grokUpdateStatus", current: "0.2.3", latest: "0.2.33", updateAvailable: true });

    expect(gear(h.doc).textContent).toContain("Update available");
    const btn = itemByText(h.doc, "Update Grok Build");
    expect(btn.className).not.toContain("disabled");

    h.posted.length = 0;
    click(h.window, btn);
    expect(types(h.posted)).toContain("updateGrok");
  });

  it("shows a grayed up-to-date status and no update action when current", () => {
    const h = boot();
    click(h.window, $(h.doc, "gear-btn"));
    click(h.window, itemByText(h.doc, "About"));
    dispatch(h.window, { type: "grokUpdateStatus", current: "0.2.33", latest: "0.2.33", updateAvailable: false });

    expect(gear(h.doc).textContent).toContain("up to date");
    expect(itemByText(h.doc, "Update Grok Build")).toBeUndefined();
  });

  it("falls back to the update check's version when the handshake gave none", () => {
    const h = bootWebview();
    dispatch(h.window, { type: "initialState", useCtrlEnter: false, effort: "", cwd: "/x", extVersion: "1.0.0" });
    // No `initialized` version (native Windows build) — the panel starts at "—".
    dispatch(h.window, { type: "session", sessionId: "s1", models: [], currentModelId: "grok-build" });
    click(h.window, $(h.doc, "gear-btn"));
    click(h.window, itemByText(h.doc, "About"));
    dispatch(h.window, { type: "grokUpdateStatus", current: "0.2.3", latest: "0.2.3", updateAvailable: false });

    const text = gear(h.doc).textContent || "";
    expect(text).toContain("Grok Build CLI");
    expect(text).toContain("v0.2.3");
    expect(text).not.toContain("—");
  });

  it("the About back row returns to the main menu", () => {
    const h = boot();
    click(h.window, $(h.doc, "gear-btn"));
    click(h.window, itemByText(h.doc, "About"));
    click(h.window, itemByText(h.doc, "← About"));
    expect(items(h.doc).some((el) => (el.textContent || "").includes("Config & debug"))).toBe(true);
  });

  it("Config & debug exposes the config + logs links and posts the right message", () => {
    const h = boot();
    click(h.window, $(h.doc, "gear-btn"));
    click(h.window, itemByText(h.doc, "Config & debug"));

    const labels = items(h.doc).map((el) => el.textContent || "");
    expect(labels.some((l) => l.includes("Open global config"))).toBe(true);
    expect(labels.some((l) => l.includes("Open project config"))).toBe(true);
    expect(labels.some((l) => l.includes("MCP servers"))).toBe(true);
    expect(labels.some((l) => l.includes("Show extension logs"))).toBe(true);

    click(h.window, itemByText(h.doc, "Show extension logs"));
    expect(types(h.posted)).toContain("showLogs");
  });
});
