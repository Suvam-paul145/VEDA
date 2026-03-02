/**
 * VEDA Extension — Main Entry Point
 *
 * This file is the first thing VSCode loads when VEDA activates.
 * Think of it as the "main()" of the extension — it wires up all commands,
 * registers the companion file watcher, and manages the WebView panel lifecycle.
 *
 * VSCode Extension lifecycle:
 *   activate()   → called once when extension first loads
 *   deactivate() → called when VSCode shuts down or extension is disabled
 */

import * as vscode from "vscode";
import { VedaPanel } from "./panels/VedaPanel";
import { CompanionMonitor } from "./companion/CompanionMonitor";
import { VedaStatusBar } from "./ui/StatusBar";

// ─── Module-level singletons ──────────────────────────────────────────────────
// These persist for the lifetime of the extension (until deactivate() is called)
let companionMonitor: CompanionMonitor | undefined;
let statusBar: VedaStatusBar | undefined;

/**
 * activate() is called by VSCode the first time any VEDA command is triggered,
 * or immediately on startup because we set "onStartupFinished" in package.json.
 *
 * @param context - VSCode gives us this object to register disposables.
 *                  Any disposable pushed here is automatically cleaned up
 *                  when the extension is deactivated.
 */
export function activate(context: vscode.ExtensionContext) {
  console.log("[VEDA] Extension activating...");

  // ── 1. Status bar item in bottom of VSCode ─────────────────────────────────
  // Shows "🤖 VEDA: Active" when companion mode is running
  statusBar = new VedaStatusBar();
  context.subscriptions.push(statusBar);

  // ── 2. Register all commands ───────────────────────────────────────────────
  // These must match the command IDs in package.json → contributes → commands
  
  // Command 1: Open/focus the main VEDA panel (sidebar WebView)
  context.subscriptions.push(
    vscode.commands.registerCommand("veda.openPanel", () => {
      VedaPanel.createOrShow(context.extensionUri);
    })
  );

  // Command 2: Analyze the entire current file
  // Gets the active editor's content and sends it to the Lambda API
  context.subscriptions.push(
    vscode.commands.registerCommand("veda.analyzeCode", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("VEDA: No file open to analyze.");
        return;
      }

      // Open the panel first so user sees something immediately
      VedaPanel.createOrShow(context.extensionUri);

      // Get the full file content and language
      const code     = editor.document.getText();
      const language = editor.document.languageId;

      // Tell the panel to start analyzing — it shows a spinner while loading
      VedaPanel.currentPanel?.sendToWebview({
        type:    "startAnalysis",
        code,
        language,
        mode:    "analyze",
      });
    })
  );

  // Command 3: Analyze only the selected text
  // Useful when the bug is in a specific function, not the whole file
  context.subscriptions.push(
    vscode.commands.registerCommand("veda.analyzeSelection", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.selection.isEmpty) {
        vscode.window.showWarningMessage("VEDA: Select some code first.");
        return;
      }

      VedaPanel.createOrShow(context.extensionUri);

      const code     = editor.document.getText(editor.selection);
      const language = editor.document.languageId;

      VedaPanel.currentPanel?.sendToWebview({
        type: "startAnalysis",
        code,
        language,
        mode: "analyze",
      });
    })
  );

  // Command 4: Toggle voice mode on/off
  context.subscriptions.push(
    vscode.commands.registerCommand("veda.startVoice", () => {
      VedaPanel.createOrShow(context.extensionUri);
      VedaPanel.currentPanel?.sendToWebview({ type: "toggleVoice" });
      vscode.window.showInformationMessage("VEDA: Voice mode activated. Say 'Hey Debug'!");
    })
  );

  // ── 3. Start Companion Monitor ─────────────────────────────────────────────
  // This watches every file save and proactively checks for bugs
  const config = vscode.workspace.getConfiguration("veda");
  if (config.get<boolean>("companionMode", true)) {
    companionMonitor = new CompanionMonitor(context.extensionUri);
    companionMonitor.start();
    context.subscriptions.push(companionMonitor);
    statusBar.setActive(true);
  }

  // ── 4. React to settings changes ──────────────────────────────────────────
  // If user toggles companionMode in settings, start/stop the monitor live
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("veda.companionMode")) {
        const enabled = vscode.workspace
          .getConfiguration("veda")
          .get<boolean>("companionMode", true);

        if (enabled && !companionMonitor) {
          companionMonitor = new CompanionMonitor(context.extensionUri);
          companionMonitor.start();
          context.subscriptions.push(companionMonitor);
          statusBar?.setActive(true);
        } else if (!enabled && companionMonitor) {
          companionMonitor.dispose();
          companionMonitor = undefined;
          statusBar?.setActive(false);
        }
      }
    })
  );

  console.log("[VEDA] Extension activated ✅");
  vscode.window.showInformationMessage("🤖 VEDA is active! Press Ctrl+Shift+D to analyze code.");
}

/**
 * deactivate() is called when VSCode shuts down or the user disables the extension.
 * Clean up anything that isn't already tracked via context.subscriptions.
 */
export function deactivate() {
  companionMonitor?.dispose();
  console.log("[VEDA] Extension deactivated.");
}
