/**
 * CompanionMonitor.ts — Always-On Background Code Watcher
 *
 * This is the "companion" in VEDA. It listens to every file save event
 * in VSCode and automatically sends the changed code to Lambda for analysis.
 * If a bug is found, it shows an inline warning and notifies the VEDA panel.
 *
 * Think of it as a senior developer looking over your shoulder —
 * silently watching, only speaking up when something actually matters.
 */

import * as vscode from "vscode";
import { VedaPanel } from "../panels/VedaPanel";

export class CompanionMonitor implements vscode.Disposable {
  private _disposables: vscode.Disposable[] = [];
  private _extensionUri: vscode.Uri;

  // Debounce timer — avoids hammering the API on rapid saves
  // If user saves again within 2 seconds, cancel the previous request
  private _debounceTimer: NodeJS.Timeout | undefined;
  private readonly DEBOUNCE_MS = 2000;

  // Diagnostic collection — this is what shows the red squiggles in the editor
  // Think of it like ESLint's error markers, but powered by AI
  private _diagnostics: vscode.DiagnosticCollection;

  // Languages we actively monitor (avoids analyzing JSON, Markdown, etc.)
  private readonly WATCHED_LANGUAGES = new Set([
    "javascript", "typescript", "javascriptreact", "typescriptreact",
    "python", "java", "go", "rust", "csharp", "cpp", "c",
  ]);

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
    // Create a named diagnostic collection — shows up in VSCode's Problems panel
    this._diagnostics  = vscode.languages.createDiagnosticCollection("veda");
  }

  /**
   * start() registers the file save listener.
   * We use onDidSaveTextDocument (on save) rather than onDidChangeTextDocument
   * (on every keystroke) to avoid making API calls on every character typed.
   */
  public start() {
    // Listen to every file save across the entire workspace
    const saveListener = vscode.workspace.onDidSaveTextDocument(
      (document) => this._onFileSaved(document)
    );
    this._disposables.push(saveListener);
    console.log("[VEDA Companion] Started watching file saves");
  }

  /**
   * _onFileSaved() is called every time the user saves a file.
   * We debounce it so rapid Ctrl+S presses don't cause multiple API calls.
   */
  private _onFileSaved(document: vscode.TextDocument) {
    // Skip files in languages we don't watch
    if (!this.WATCHED_LANGUAGES.has(document.languageId)) { return; }

    // Skip files that are too large (> 50KB) — avoids slow/expensive API calls
    if (document.getText().length > 50000) { return; }

    // Cancel any pending debounced request
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }

    // Schedule the analysis after 2 seconds of no additional saves
    this._debounceTimer = setTimeout(() => {
      this._analyzeFile(document);
    }, this.DEBOUNCE_MS);
  }

  /**
   * _analyzeFile() calls the Lambda API in "companion" mode.
   * Companion mode uses Gemini 2.5 Flash — extremely fast (~400ms).
   * We only show a notification if the severity is "high" or "critical".
   */
  private async _analyzeFile(document: vscode.TextDocument) {
    const config = vscode.workspace.getConfiguration("veda");
    const apiUrl = config.get<string>("apiUrl", "");

    if (!apiUrl || apiUrl.includes("YOUR_API_ID")) {
      // API URL not configured yet — don't spam the user with errors
      return;
    }

    try {
      const response = await fetch(apiUrl, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code:     document.getText().slice(0, 4000), // Limit to 4KB for speed
          language: document.languageId,
          mode:     "companion",
          question: "Quick bug check",
        }),
      });

      if (!response.ok) { return; }

      const result = await response.json() as Record<string, unknown>;
      const body   = typeof result.body === "string"
        ? JSON.parse(result.body) as Record<string, unknown>
        : result;

      const severity = (body.severity as string) || "none";
      const hasIssue = body.has_issue === true;

      if (hasIssue && (severity === "critical" || severity === "high")) {
        // Show a subtle notification with the hint
        const hint = (body.hint as string) || "Potential issue detected.";
        
        vscode.window.showWarningMessage(
          `🤖 VEDA: ${hint}`,
          "Show Details",
          "Dismiss"
        ).then((choice) => {
          if (choice === "Show Details") {
            // Open the panel and trigger a full analysis
            VedaPanel.createOrShow(this._extensionUri);
            VedaPanel.currentPanel?.sendToWebview({
              type:    "analysisResult",
              data:    body,
            });
          }
        });

        // Also send to the panel if it's already open
        VedaPanel.currentPanel?.sendToWebview({
          type:     "companionHint",
          hint,
          severity,
        });
      }

    } catch (err) {
      // Silently ignore network errors in companion mode
      // We don't want to spam the user with errors on every save
      console.warn("[VEDA Companion] Analysis failed silently:", (err as Error).message);
    }
  }

  public dispose() {
    if (this._debounceTimer) { clearTimeout(this._debounceTimer); }
    this._diagnostics.dispose();
    this._disposables.forEach((d) => d.dispose());
    this._disposables = [];
    console.log("[VEDA Companion] Stopped.");
  }
}
