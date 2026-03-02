/**
 * StatusBar.ts — VSCode Bottom Status Bar Item
 *
 * This creates the "🤖 VEDA: Active" text you see in the very bottom bar
 * of VSCode (the blue bar). Clicking it opens the VEDA panel.
 *
 * It's a simple but important UX touch — it tells the user at a glance
 * that VEDA is running and watching their code.
 */

import * as vscode from "vscode";

export class VedaStatusBar implements vscode.Disposable {
  private _item: vscode.StatusBarItem;

  constructor() {
    // Create the status bar item on the LEFT side, with priority 100
    // Higher priority = further left in the bar
    this._item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );

    // Clicking the status bar item opens the VEDA panel
    this._item.command = "veda.openPanel";
    this._item.tooltip = "Click to open VEDA Debugging Assistant";

    // Show in idle state initially
    this.setActive(false);
    this._item.show();
  }

  /**
   * setActive() updates the status bar text to reflect companion mode state.
   * When active: green dot + "VEDA: Watching"
   * When idle:   grey dot + "VEDA: Idle"
   */
  public setActive(active: boolean) {
    if (active) {
      this._item.text            = "$(circle-filled) VEDA: Watching";
      this._item.backgroundColor = undefined; // Use default (no background)
    } else {
      this._item.text            = "$(circle-outline) VEDA: Idle";
      this._item.backgroundColor = undefined;
    }
  }

  /** Called when VSCode shows "VEDA is thinking..." during an analysis */
  public setAnalyzing() {
    this._item.text = "$(sync~spin) VEDA: Analyzing...";
  }

  public dispose() {
    this._item.dispose();
  }
}
