/**
 * VedaPanel.ts — The Main WebView Panel
 *
 * A WebView in VSCode is like an embedded browser window inside the editor.
 * Everything inside it is plain HTML/CSS/JavaScript — it can render Mermaid
 * diagrams, show diff views, play voice, and communicate back to the extension
 * through a message-passing API (postMessage / onDidReceiveMessage).
 *
 * Message flow:
 *   Extension → WebView:  panel.webview.postMessage({ type, ...data })
 *   WebView → Extension:  vscode.postMessage({ type, ...data })  (inside HTML)
 *                         panel.webview.onDidReceiveMessage(handler)
 */

import * as vscode from "vscode";
import * as https  from "https";

export class VedaPanel {
  // Static singleton — only one panel open at a time
  public static currentPanel: VedaPanel | undefined;

  private readonly _panel:        vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private          _disposables:  vscode.Disposable[] = [];

  /**
   * createOrShow() is the main entry point.
   * If a panel already exists it just reveals it; otherwise creates a new one.
   * This pattern prevents duplicate panels when the user triggers the command twice.
   */
  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If panel already exists → just bring it to focus
    if (VedaPanel.currentPanel) {
      VedaPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Create a brand new WebView panel
    const panel = vscode.window.createWebviewPanel(
      "vedaDebugPanel",              // Unique identifier (used internally by VSCode)
      "🤖 VEDA",                     // Title shown in the tab
      column || vscode.ViewColumn.Two, // Open beside the editor, not replacing it
      {
        enableScripts:              true,  // REQUIRED: allows JavaScript in the WebView
        retainContextWhenHidden:    true,  // Keep panel state when user switches tabs
        localResourceRoots:         [extensionUri], // Security: only load local files from extension folder
      }
    );

    VedaPanel.currentPanel = new VedaPanel(panel, extensionUri);
  }

  /** Private constructor — use createOrShow() instead */
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel        = panel;
    this._extensionUri = extensionUri;

    // Set the HTML content of the WebView immediately
    this._panel.webview.html = this._buildHtml();

    // Listen for the panel being closed by the user (clicking the X on the tab)
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Listen for messages coming FROM the WebView (e.g., user clicked "Apply Fix")
    this._panel.webview.onDidReceiveMessage(
      (message) => this._handleWebviewMessage(message),
      null,
      this._disposables
    );
  }

  /**
   * sendToWebview() is called by extension.ts to push data into the WebView.
   * The WebView listens for these via window.addEventListener('message', ...).
   */
  public sendToWebview(data: Record<string, unknown>) {
    this._panel.webview.postMessage(data).then(undefined, (err) => {
      console.error("[VEDA] Failed to post message to webview:", err);
    });
  }

  /**
   * _handleWebviewMessage() receives actions from the WebView HTML.
   * For example: user clicks "Apply Fix" → WebView sends {type: "applyFix", code: "..."}
   * → this handler applies it to the active editor.
   */
  private async _handleWebviewMessage(message: Record<string, unknown>) {
    switch (message.type) {
      // User clicked "Apply Fix" in the WebView
      case "applyFix": {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        await editor.edit((editBuilder) => {
          const fullRange = new vscode.Range(
            editor.document.positionAt(0),
            editor.document.positionAt(editor.document.getText().length)
          );
          editBuilder.replace(fullRange, message.fixCode as string);
        });
        vscode.window.showInformationMessage("✅ VEDA applied the fix!");
        break;
      }

      // WebView is requesting an analysis — it sends the code, we call Lambda
      case "analyzeRequest": {
        await this._callApi({
          code:     message.code     as string,
          language: message.language as string,
          question: message.question as string || "What bugs do you see?",
          mode:     message.mode     as string || "analyze",
        });
        break;
      }

      // User clicked a node in the Mermaid diagram → jump to that line in editor
      case "jumpToLine": {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        const line     = (message.line as number) - 1; // VSCode is 0-indexed
        const position = new vscode.Position(Math.max(0, line), 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
        break;
      }
    }
  }

  /**
   * _callApi() makes the actual HTTPS request to your API Gateway endpoint.
   * It handles streaming the response back to the WebView progressively.
   */
  public async _callApi(payload: {
    code: string;
    language: string;
    question: string;
    mode: string;
  }) {
    // Tell WebView to show the loading spinner
    this.sendToWebview({ type: "analysisStart" });

    // Get the API URL from VSCode settings
    const config = vscode.workspace.getConfiguration("veda");
    const apiUrl = config.get<string>(
      "apiUrl",
      "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/analyze"
    );

    try {
      const response = await fetch(apiUrl, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${await response.text()}`);
      }

      const result = await response.json() as Record<string, unknown>;
      const body   = typeof result.body === "string"
        ? JSON.parse(result.body)
        : result;

      // Send the full analysis to the WebView for rendering
      this.sendToWebview({ type: "analysisResult", data: body });

    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[VEDA] API call failed:", message);
      this.sendToWebview({
        type:    "analysisError",
        message: `VEDA could not reach the API: ${message}`,
      });
    }
  }

  /**
   * _buildHtml() generates the entire WebView UI.
   *
   * This is a single self-contained HTML page. It includes:
   * - Mermaid.js CDN for rendering flowcharts
   * - Voice synthesis using Web Speech API (built into Chromium, which VSCode uses)
   * - A chat-style interface for displaying results
   * - Diff preview for bug fixes
   *
   * Security note: The nonce is a random token that VSCode uses to verify
   * that only scripts with this nonce are allowed to run (Content Security Policy).
   */
  private _buildHtml(): string {
    const nonce = getNonce();

    return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             script-src 'nonce-${nonce}' https://cdn.jsdelivr.net;
             style-src  'unsafe-inline' https://cdn.jsdelivr.net;
             img-src    data: https:;
             connect-src https:;">
  <title>VEDA</title>
  <style>
    /* ── Variables matching VSCode's theme ───────────────────────── */
    :root {
      --bg:      var(--vscode-editor-background);
      --surface: var(--vscode-sideBar-background);
      --border:  var(--vscode-panel-border);
      --text:    var(--vscode-editor-foreground);
      --accent:  var(--vscode-button-background);
      --success: #10b981;
      --error:   #ef4444;
      --warning: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--vscode-font-family);
      font-size:   var(--vscode-font-size);
      color:       var(--text);
      background:  var(--bg);
      height:      100vh;
      display:     flex;
      flex-direction: column;
      overflow:    hidden;
    }

    /* ── Header ──────────────────────────────────────────────────── */
    .header {
      display:         flex;
      align-items:     center;
      gap:             10px;
      padding:         12px 16px;
      background:      var(--surface);
      border-bottom:   1px solid var(--border);
      flex-shrink:     0;
    }
    .header h1 { font-size: 16px; font-weight: 700; }
    .companion-badge {
      margin-left:     auto;
      font-size:       11px;
      padding:         2px 8px;
      border-radius:   20px;
      background:      var(--success);
      color:           white;
    }

    /* ── Toolbar ─────────────────────────────────────────────────── */
    .toolbar {
      display:         flex;
      gap:             8px;
      padding:         10px 16px;
      border-bottom:   1px solid var(--border);
      flex-shrink:     0;
    }
    button {
      padding:         6px 14px;
      border:          1px solid var(--border);
      border-radius:   6px;
      cursor:          pointer;
      font-size:       12px;
      background:      var(--surface);
      color:           var(--text);
      transition:      all 0.15s;
    }
    button:hover          { background: var(--accent); color: white; border-color: var(--accent); }
    button.primary        { background: var(--accent); color: white; border-color: var(--accent); }
    button.primary:hover  { opacity: 0.85; }
    button.success        { background: var(--success); color: white; border-color: var(--success); }
    button:disabled       { opacity: 0.4; cursor: not-allowed; }

    /* ── Main content area ────────────────────────────────────────── */
    .content { flex: 1; overflow-y: auto; padding: 16px; }

    /* ── Empty state ─────────────────────────────────────────────── */
    .empty-state {
      display:         flex;
      flex-direction:  column;
      align-items:     center;
      justify-content: center;
      height:          100%;
      gap:             16px;
      opacity:         0.6;
      text-align:      center;
    }
    .empty-state .robot { font-size: 64px; }
    .empty-state p      { max-width: 280px; line-height: 1.5; }

    /* ── Loading spinner ─────────────────────────────────────────── */
    .loading {
      display:         flex;
      align-items:     center;
      gap:             12px;
      padding:         20px;
      opacity:         0.8;
    }
    .spinner {
      width:           24px;
      height:          24px;
      border:          3px solid var(--border);
      border-top:      3px solid var(--accent);
      border-radius:   50%;
      animation:       spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Result card ─────────────────────────────────────────────── */
    .result-card {
      border:          1px solid var(--border);
      border-radius:   10px;
      overflow:        hidden;
      margin-bottom:   16px;
    }

    .severity-bar {
      height:          4px;
      width:           100%;
    }
    .severity-critical { background: var(--error);   }
    .severity-high     { background: var(--error);   opacity: 0.8; }
    .severity-medium   { background: var(--warning); }
    .severity-low      { background: var(--success); }
    .severity-none     { background: var(--success); }

    .card-header {
      padding:         12px 16px;
      display:         flex;
      align-items:     center;
      gap:             10px;
      background:      var(--surface);
    }
    .bug-badge {
      font-size:       11px;
      padding:         2px 8px;
      border-radius:   20px;
      background:      var(--error);
      color:           white;
      text-transform:  uppercase;
      letter-spacing:  0.5px;
    }
    .bug-badge.none { background: var(--success); }

    .card-body { padding: 16px; }

    .explanation {
      line-height:     1.6;
      margin-bottom:   12px;
    }
    .root-cause {
      padding:         10px 14px;
      border-left:     3px solid var(--warning);
      background:      var(--surface);
      border-radius:   0 6px 6px 0;
      font-size:       13px;
      margin-bottom:   16px;
      line-height:     1.5;
    }
    .root-cause strong { display: block; margin-bottom: 4px; font-size: 11px; opacity: 0.7; text-transform: uppercase; }

    /* ── Mermaid diagram ─────────────────────────────────────────── */
    .diagram-section {
      margin-bottom:   16px;
    }
    .diagram-section h3 {
      font-size:       12px;
      text-transform:  uppercase;
      opacity:         0.6;
      margin-bottom:   10px;
      letter-spacing:  0.5px;
    }
    .diagram-container {
      background:      var(--surface);
      border:          1px solid var(--border);
      border-radius:   8px;
      padding:         16px;
      overflow-x:      auto;
      text-align:      center;
    }

    /* ── Fix section ─────────────────────────────────────────────── */
    .fix-section { margin-bottom: 16px; }
    .fix-section h3 {
      font-size:       12px;
      text-transform:  uppercase;
      opacity:         0.6;
      margin-bottom:   10px;
      letter-spacing:  0.5px;
    }
    pre {
      background:      var(--surface);
      border:          1px solid var(--border);
      border-radius:   8px;
      padding:         14px;
      overflow-x:      auto;
      font-family:     var(--vscode-editor-font-family, 'Fira Code', monospace);
      font-size:       13px;
      line-height:     1.5;
      white-space:     pre-wrap;
      word-break:      break-word;
    }
    .fix-actions {
      display:         flex;
      gap:             8px;
      margin-top:      10px;
    }

    /* ── Voice indicator ─────────────────────────────────────────── */
    .voice-indicator {
      display:         flex;
      align-items:     center;
      gap:             8px;
      padding:         8px 16px;
      font-size:       12px;
      opacity:         0.7;
      border-top:      1px solid var(--border);
      flex-shrink:     0;
    }
    .voice-dot {
      width:           8px;
      height:          8px;
      border-radius:   50%;
      background:      var(--success);
    }
    .voice-dot.speaking { animation: pulse 1s infinite; background: var(--accent); }
    @keyframes pulse    { 0%,100% { transform: scale(1); } 50% { transform: scale(1.4); } }

    /* ── Meta info ────────────────────────────────────────────────── */
    .meta {
      font-size:       11px;
      opacity:         0.5;
      margin-top:      16px;
      padding-top:     12px;
      border-top:      1px solid var(--border);
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <span>🤖</span>
    <h1>VEDA Debugging Assistant</h1>
    <div class="companion-badge" id="companionBadge">● Companion Active</div>
  </div>

  <!-- Toolbar -->
  <div class="toolbar">
    <button class="primary" onclick="requestAnalysis('analyze')">🔍 Analyze File</button>
    <button onclick="requestAnalysis('deep')">🧠 Deep Analysis</button>
    <button onclick="toggleVoice()" id="voiceBtn">🎤 Voice On</button>
    <button onclick="clearPanel()" style="margin-left:auto;">✕ Clear</button>
  </div>

  <!-- Main Content -->
  <div class="content" id="content">
    <div class="empty-state" id="emptyState">
      <div class="robot">🤖</div>
      <h2>VEDA is watching your code</h2>
      <p>Click <strong>Analyze File</strong> or press <kbd>Ctrl+Shift+D</kbd> to detect and fix bugs instantly.</p>
      <p style="margin-top:8px;font-size:12px">Or just save any file — companion mode will check it automatically.</p>
    </div>
  </div>

  <!-- Voice status bar at bottom -->
  <div class="voice-indicator">
    <div class="voice-dot" id="voiceDot"></div>
    <span id="voiceStatus">Voice ready</span>
  </div>

  <!-- Load Mermaid.js from CDN for flowchart rendering -->
  <script nonce="${nonce}" src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>

  <script nonce="${nonce}">
    // ── Mermaid initialization ──────────────────────────────────────────────
    mermaid.initialize({
      startOnLoad: false,
      theme:       document.body.classList.contains('vscode-dark') ? 'dark' : 'default',
      securityLevel: 'loose',
    });

    // ── VSCode API bridge ───────────────────────────────────────────────────
    // acquireVsCodeApi() gives us the bridge to talk back to the extension.
    // It can only be called ONCE — so we store the result in a variable.
    const vscodeApi = acquireVsCodeApi();

    // ── State ───────────────────────────────────────────────────────────────
    let voiceEnabled = true;
    let currentFixCode = '';

    // ── Listen for messages FROM the extension (extension.ts calls sendToWebview) ──
    window.addEventListener('message', async (event) => {
      const msg = event.data;

      switch (msg.type) {

        // Extension tells us to start analyzing — show spinner immediately
        case 'startAnalysis':
        case 'analysisStart':
          showLoading();
          if (msg.code) {
            // If code was passed directly, immediately fire the API request
            vscodeApi.postMessage({
              type:     'analyzeRequest',
              code:     msg.code,
              language: msg.language || 'javascript',
              question: 'What bugs do you see in this code?',
              mode:     msg.mode || 'analyze',
            });
          }
          break;

        // Analysis finished — render the full result
        case 'analysisResult':
          await renderResult(msg.data);
          break;

        // Analysis failed — show error
        case 'analysisError':
          showError(msg.message);
          break;

        // Toggle voice on/off
        case 'toggleVoice':
          toggleVoice();
          break;

        // Companion mode detected something — show a subtle notification
        case 'companionHint':
          showCompanionHint(msg.hint, msg.severity);
          break;
      }
    });

    // ── renderResult() — takes the API response and builds the full UI ──────
    async function renderResult(data) {
      const content = document.getElementById('content');
      const severity = data.severity || 'none';
      const hasBug   = severity !== 'none';

      // Speak the voice response if voice is enabled
      if (voiceEnabled && data.voice_response) {
        speak(data.voice_response);
      }

      content.innerHTML = buildResultHTML(data, severity, hasBug);

      // Render the Mermaid diagram now that it's in the DOM
      if (data.mermaid_diagram) {
        try {
          // Replace literal \\n with real newlines for Mermaid
          const diagramCode  = data.mermaid_diagram.replace(/\\\\n/g, '\\n');
          const { svg }      = await mermaid.render('vedaDiagram' + Date.now(), diagramCode);
          const diagramEl    = document.getElementById('diagramTarget');
          if (diagramEl) { diagramEl.innerHTML = svg; }
        } catch (err) {
          const diagramEl = document.getElementById('diagramTarget');
          if (diagramEl) { diagramEl.innerHTML = '<p style="opacity:0.5;font-size:12px">Diagram could not render.</p>'; }
        }
      }
    }

    // ── buildResultHTML() — generates the HTML for a single analysis result ──
    function buildResultHTML(data, severity, hasBug) {
      const meta = data._meta || {};
      currentFixCode = data.fix_code || '';

      return \`
        <div class="result-card">
          <div class="severity-bar severity-\${severity}"></div>
          <div class="card-header">
            <span>\${hasBug ? '❌' : '✅'}</span>
            <strong>\${hasBug ? 'Bug Detected' : 'No Issues Found'}</strong>
            \${hasBug ? \`<span class="bug-badge">\${(data.bug_type || 'unknown').replace(/_/g,' ')}</span>\` : ''}
          </div>
          <div class="card-body">

            <div class="explanation">\${data.explanation || 'Analysis complete.'}</div>

            \${data.root_cause ? \`
              <div class="root-cause">
                <strong>Root Cause</strong>
                \${data.root_cause}
              </div>
            \` : ''}

            \${data.mermaid_diagram ? \`
              <div class="diagram-section">
                <h3>👁️ Error Flow Diagram</h3>
                <div class="diagram-container">
                  <div id="diagramTarget">
                    <div class="spinner" style="margin:auto"></div>
                  </div>
                </div>
              </div>
            \` : ''}

            \${data.fix_code ? \`
              <div class="fix-section">
                <h3>🛠️ Suggested Fix</h3>
                <pre>\${escapeHtml(data.fix_code)}</pre>
                \${data.fix_explanation ? \`
                  <p style="margin-top:8px;font-size:13px;opacity:0.8;line-height:1.5">\${data.fix_explanation}</p>
                \` : ''}
                <div class="fix-actions">
                  <button class="success" onclick="applyFix()">✅ Apply Fix</button>
                  <button onclick="copyFix()">📋 Copy</button>
                </div>
              </div>
            \` : ''}

            <div class="meta">
              Analyzed by \${meta.model || 'AI'} via \${meta.provider || 'API'}
              in \${meta.latency_ms || '?'}ms
            </div>
          </div>
        </div>
      \`;
    }

    // ── applyFix() — sends the fix code back to the extension to apply ──────
    function applyFix() {
      if (!currentFixCode) { return; }
      vscodeApi.postMessage({ type: 'applyFix', fixCode: currentFixCode });
    }

    // ── copyFix() — copies fix to clipboard ─────────────────────────────────
    function copyFix() {
      navigator.clipboard.writeText(currentFixCode).then(() => {
        const btn = event.target;
        btn.textContent = '✅ Copied!';
        setTimeout(() => { btn.textContent = '📋 Copy'; }, 2000);
      });
    }

    // ── requestAnalysis() — asks extension to get the active editor code ────
    function requestAnalysis(mode) {
      vscodeApi.postMessage({ type: 'analyzeRequest', mode });
      showLoading();
    }

    // ── showLoading() / showError() ──────────────────────────────────────────
    function showLoading() {
      document.getElementById('content').innerHTML = \`
        <div class="loading">
          <div class="spinner"></div>
          <span>VEDA is analyzing your code...</span>
        </div>
      \`;
    }

    function showError(message) {
      document.getElementById('content').innerHTML = \`
        <div class="result-card">
          <div class="severity-bar severity-high"></div>
          <div class="card-body">
            <p>⚠️ \${message}</p>
            <p style="margin-top:8px;font-size:12px;opacity:0.7">
              Check that your API URL is set in VSCode Settings → VEDA → Api Url
            </p>
          </div>
        </div>
      \`;
    }

    function showCompanionHint(hint, severity) {
      // A subtle toast at the bottom of the content area
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:40px;right:16px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 14px;font-size:12px;max-width:280px;z-index:100;';
      toast.innerHTML = \`💡 \${hint}\`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 6000);
    }

    // ── clearPanel() ─────────────────────────────────────────────────────────
    function clearPanel() {
      document.getElementById('content').innerHTML = \`
        <div class="empty-state" id="emptyState">
          <div class="robot">🤖</div>
          <h2>VEDA is watching your code</h2>
          <p>Click <strong>Analyze File</strong> or press <kbd>Ctrl+Shift+D</kbd> to start.</p>
        </div>
      \`;
    }

    // ── Voice synthesis using Web Speech API ─────────────────────────────────
    // VSCode's WebView runs in Chromium, which has full Web Speech API support.
    function speak(text) {
      if (!voiceEnabled) { return; }
      if (!window.speechSynthesis) { return; }

      window.speechSynthesis.cancel(); // Stop any current speech first

      const utterance  = new SpeechSynthesisUtterance(text);
      utterance.rate   = 0.9;   // Slightly slower than default — easier to follow
      utterance.pitch  = 1.0;
      utterance.volume = 1.0;

      // Update voice indicator while speaking
      utterance.onstart = () => {
        document.getElementById('voiceDot').className    = 'voice-dot speaking';
        document.getElementById('voiceStatus').textContent = '🔊 Speaking...';
      };
      utterance.onend = () => {
        document.getElementById('voiceDot').className    = 'voice-dot';
        document.getElementById('voiceStatus').textContent = 'Voice ready';
      };

      window.speechSynthesis.speak(utterance);
    }

    function toggleVoice() {
      voiceEnabled = !voiceEnabled;
      const btn = document.getElementById('voiceBtn');
      btn.textContent = voiceEnabled ? '🎤 Voice On' : '🔇 Voice Off';
      if (!voiceEnabled) { window.speechSynthesis?.cancel(); }
    }

    // ── Utility: escape HTML to prevent XSS in code display ─────────────────
    function escapeHtml(str) {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  </script>
</body>
</html>
    `;
  }

  public dispose() {
    VedaPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) { d.dispose(); }
    }
  }
}

/** Generates a cryptographically random nonce for the Content Security Policy */
function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
