// Shared test harness for driving the REAL shipped webview scripts
// (media/chat.js + media/webview-helpers.js) inside a happy-dom window.
//
// happy-dom doesn't execute inline <script> text synchronously, but window.eval
// runs in the window's realm and shares its globals — webview-helpers sets
// window.GrokWebviewHelpers, and chat.js reads it at startup. We stub
// acquireVsCodeApi to capture the postMessage payloads the webview sends back to
// the extension host, then dispatch the same messages sidebar.ts posts.
//
// This file is NOT a test (it has no *.test.ts suffix, so vitest's
// include glob "test/**/*.test.ts" skips it); it's imported by the DOM tests.
import { Window } from "happy-dom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const helperSrc = read("../media/webview-helpers.js");
const chatSrc = read("../media/chat.js");

// Mirror of getHtml()'s <body> — only the ids chat.js queries at startup matter.
export const BODY = `
  <header class="top-bar">
    <div class="top-brand"><span class="top-brand-text">Grok Build</span></div>
    <div class="top-model-wrap">
      <button id="model-btn" class="top-model-btn">
        <span id="model-label"></span>
      </button>
    </div>
    <div class="top-actions">
      <button id="history-btn"></button>
      <button id="new-btn"></button>
    </div>
    <div id="model-popover" class="model-popover model-popover-dropdown" hidden></div>
    <div id="history-popover" hidden></div>
  </header>
  <main id="messages" class="messages">
    <div class="welcome" id="welcome">
      <div class="welcome-loader-wrap" id="welcome-loader">
        <span class="welcome-mark grok-mark-wrap"><svg class="grok-mark-svg" viewBox="0 0 24 24" fill="none"><path d="M3.75 2.25L0.75 12L3.75 21.75" stroke="currentColor" stroke-width="1.125" stroke-linecap="square" stroke-linejoin="miter"/><path d="M20.25 2.25L23.25 12L20.25 21.75" stroke="currentColor" stroke-width="1.125" stroke-linecap="square" stroke-linejoin="miter"/><g transform="translate(12 12) scale(0.721875) translate(-12 -12)" fill="currentColor"><path d="M15.4541 4.29785L10.4541 20.2979L8.5459 19.7021L13.5459 3.70215L15.4541 4.29785"/><path d="M6.78125 7.625L3.28125 12L6.78125 16.375L5.21875 17.625L0.719727 12L5.21875 6.375L6.78125 7.625"/><path d="M23.2803 12L18.7812 17.625L17.2188 16.375L20.7188 12L17.2188 7.625L18.7812 6.375L23.2803 12"/></g></svg></span>
      </div>
      <h2>Grok Build</h2>
      <p class="welcome-byline muted">Plan · Build · Ship</p>
      <p id="welcome-version" class="loading-dots">Starting</p>
      <div id="welcome-onboarding"></div>
    </div>
  </main>
  <footer class="composer">
    <div id="chips-row" class="chips-row" hidden>
      <div id="chips"></div>
    </div>
    <div class="composer-controls composer-controls-footer">
      <div class="controls-cluster controls-left">
        <button id="add-btn" class="footer-pill context-toolbar-btn"></button>
        <button id="mode-btn" class="footer-pill mode-toolbar-btn"></button>
      </div>
      <div class="controls-cluster controls-right">
        <div id="donut"><svg><circle id="donut-arc"/></svg><span id="donut-label"></span></div>
        <button id="gear-btn"></button>
      </div>
    </div>
    <div class="composer-input-wrap">
      <div id="input-highlight"></div>
      <textarea id="input"></textarea>
      <button id="action-btn" class="action-btn mic-mode" type="button"></button>
    </div>
    <button id="upload-btn" hidden></button>
    <div id="mode-popover" hidden></div>
    <div id="gear-popover" hidden></div>
    <div id="add-popover" hidden></div>
    <div id="slash-popover" hidden></div>
  </footer>`;

export interface Posted { type: string; [k: string]: unknown }

export interface Harness {
  window: Window;
  posted: Posted[];
  doc: Document;
}

export function bootWebview(): Harness {
  const window = new Window({ url: "https://localhost/" });
  const posted: Posted[] = [];
  (window as any).acquireVsCodeApi = () => ({
    postMessage: (m: Posted) => posted.push(m),
    setState: () => {},
    getState: () => undefined,
  });
  const doc = (window as any).document as Document;
  doc.body.innerHTML = BODY;
  (window as any).eval(helperSrc);
  (window as any).eval(chatSrc);
  posted.length = 0; // drop chat.js's startup {type:"ready"} so tests see only their own messages
  return { window, posted, doc };
}

/** Deliver a message to the webview exactly as the extension host would. */
export function dispatch(window: Window, data: Posted): void {
  (window as any).dispatchEvent(new (window as any).MessageEvent("message", { data }));
}

/** Click via a real bubbling MouseEvent so onclick + stopPropagation behave like the browser. */
export function click(window: Window, el: Element): void {
  el.dispatchEvent(new (window as any).MouseEvent("click", { bubbles: true, cancelable: true }));
}