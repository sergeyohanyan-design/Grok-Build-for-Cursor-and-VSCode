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
        <span class="welcome-mark grok-mark-wrap"><svg class="grok-mark-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17.559 6.552L17.583 6.542L17.598 6.575L16.98 7.496L16.586 8.187L16.426 8.555L16.356 8.762L16.26 9.177L16.223 9.706L16.24 10.052L16.307 10.466L16.488 11.226L16.531 11.549L16.554 11.917L16.534 12.447L16.486 12.815L16.413 13.161L16.317 13.482L16.165 13.875L16.021 14.174L15.819 14.519L15.587 14.842L15.378 15.095L15.05 15.424L14.797 15.635L14.52 15.834L14.175 16.042L13.783 16.232L13.185 16.436L12.586 16.554L11.964 16.59L11.596 16.575L11.227 16.529L10.813 16.438L10.513 16.347L10.168 16.208L9.869 16.063L9.592 15.908L9.357 15.74L10.099 15.268L10.513 15.06L10.698 15.009L10.813 15.016L11.135 15.122L11.435 15.19L11.872 15.238L12.148 15.234L12.54 15.197L13.024 15.077L13.415 14.916L13.714 14.753L14.083 14.483L14.382 14.194L14.641 13.875L14.875 13.483L15.075 12.999L15.149 12.723L15.195 12.447L15.22 11.94L15.172 11.48L15.102 11.18L14.965 10.789L14.867 10.605L14.797 10.553L14.682 10.571L14.451 10.714L10.698 13.514L10.398 13.722L10.345 13.713L10.436 13.598L10.997 13.027L15.073 8.939L17.537 6.567Z"/><path d="M11.765 7.519L12.218 7.512L12.494 7.535L12.816 7.58L13.277 7.694L13.691 7.834L14.059 8.002L14.382 8.18L14.636 8.341L14.686 8.394L14.29 8.657L13.83 8.93L13.599 9.049L13.415 9.111L13.346 9.117L13.231 9.093L12.862 8.962L12.586 8.897L12.148 8.846L11.872 8.843L11.596 8.87L11.135 8.961L10.721 9.106L10.398 9.264L10.053 9.495L9.684 9.822L9.536 9.983L9.33 10.259L9.165 10.535L9.007 10.881L8.897 11.203L8.849 11.411L8.799 11.756L8.793 12.032L8.8 12.309L8.848 12.654L8.92 12.953L9.053 13.322L9.166 13.552L9.334 13.828L9.645 14.22L9.673 14.289L9.262 14.704L8.625 15.284L6.806 16.853L6.069 17.458L6.038 17.444L6.104 17.352L6.998 16.339L7.389 15.855L7.664 15.394L7.78 15.072L7.85 14.704L7.866 14.427L7.85 14.105L7.8 13.828L7.603 13.184L7.51 12.746L7.461 12.286L7.461 11.733L7.51 11.318L7.625 10.812L7.765 10.397L8.001 9.891L8.321 9.384L8.625 9.01L9.04 8.609L9.546 8.23L10.099 7.925L10.559 7.745L10.882 7.648L11.204 7.579L11.757 7.52Z"/><path d="M19.181 8.164L19.195 8.146L19.218 8.16L23.794 11.572L23.8 12.424L23.798 12.447L23.732 12.502L19.195 15.889L19.178 15.878L19.183 14.059L21.92 12.009L19.181 9.96L19.18 8.187Z"/><path d="M4.786 8.164L4.802 8.151L4.824 8.164L4.818 9.96L2.077 12.009L4.818 14.059L4.821 15.878L4.802 15.888L1.371 13.327L0.22 12.462L0.2 12.424L0.202 11.595L0.22 11.559L4.779 8.169Z"/></svg></span>
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