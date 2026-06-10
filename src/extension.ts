import * as vscode from "vscode";
import { GrokSidebar } from "./sidebar";

/** Open Grok in the secondary sidebar with fallbacks for VS Code / Cursor. */
async function openGrokPanel(sidebar: GrokSidebar): Promise<void> {
  const cmds = new Set(await vscode.commands.getCommands(true));

  // Primary: focus the extension's view container (registered when activitybar exists).
  if (cmds.has("workbench.view.extension.grokSidebar")) {
    try {
      await vscode.commands.executeCommand("workbench.view.extension.grokSidebar");
    } catch {
      // Host rejected the command — fall through to reveal().
    }
  }

  // Show the webview if it was already resolved.
  sidebar.openPanel();

  // Focus the secondary sidebar (auxiliary bar).
  if (cmds.has("workbench.action.focusAuxiliaryBar")) {
    try {
      await vscode.commands.executeCommand("workbench.action.focusAuxiliaryBar");
    } catch {
      // Best-effort — panel may already be visible.
    }
  }

  // Second reveal after auxiliary bar is focused (view may resolve on first show).
  sidebar.openPanel();
}

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("Grok");
  const sidebar = new GrokSidebar(context, output);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(GrokSidebar.viewId, sidebar, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    output,
    { dispose: () => sidebar.dispose() },
    vscode.commands.registerCommand("grok.open", () => openGrokPanel(sidebar)),
    vscode.commands.registerCommand("grok.newSession", () => sidebar.newSession()),
    vscode.commands.registerCommand("grok.compact", () => {
      vscode.window.showInformationMessage(
        "Type /compact in the composer to compress the conversation.",
      );
    }),
    vscode.commands.registerCommand("grok.pickModel", () => sidebar.openModelPopover()),
    vscode.commands.registerCommand("grok.toggleMode", () => sidebar.openModePopover()),
    vscode.commands.registerCommand("grok.sendSelection", () =>
      sidebar.insertActiveMention({ selection: true }),
    ),
    vscode.commands.registerCommand(
      "grok.sendFile",
      (uri?: vscode.Uri) => sidebar.insertActiveMention({ uri }),
    ),
    vscode.commands.registerCommand("grok.insertAtMention", () =>
      sidebar.insertActiveMention(),
    ),
    vscode.commands.registerCommand("grok.uploadFile", async () => {
      await openGrokPanel(sidebar);
      sidebar.uploadFiles();
    }),
    vscode.commands.registerCommand("grok.attachActiveFile", async () => {
      await openGrokPanel(sidebar);
      sidebar.attachActiveFile();
    }),
    vscode.commands.registerCommand("grok.showLogs", () => output.show()),
    vscode.commands.registerCommand("grok.logout", () => sidebar.logout()),
    vscode.commands.registerCommand("grok._debugDummyPlan", () => sidebar.debugShowDummyPlan()),
  );

  // Start grok as soon as the extension loads — don't wait for the webview "ready"
  // message (which can be lost on reload races and leaves the UI stuck on Connecting).
  void sidebar.bootstrapSession();

  const autoOpen = vscode.workspace
    .getConfiguration("grok")
    .get<boolean>("autoOpenSecondarySidebar", true);
  if (autoOpen) {
    setTimeout(() => {
      void openGrokPanel(sidebar);
    }, 2500);
  }
}

export function deactivate(): void {
  // disposables handle cleanup
}