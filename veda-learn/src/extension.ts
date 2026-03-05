import * as vscode from 'vscode';

const REST_URL = 'https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev';
const WS_URL = 'wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev';
const GITHUB_CLIENT_ID = 'Ov23liUfaTgayCi8bO5n';

let ws: any = null;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
	_context = context;
	console.log('🚀 Veda Learn: Extension activating...');

	// Initialize status bar
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = '$(eye) Veda watching...';
	statusBarItem.tooltip = 'Veda Learn is analyzing your code in the background';
	statusBarItem.command = 'veda.login'; // Can change later to openSidebar if needed
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	// Pulse the status bar when an analysis is in flight
	function setStatusAnalyzing() {
		statusBarItem.text = '$(sync~spin) Veda analyzing...';
		setTimeout(() => { statusBarItem.text = '$(eye) Veda watching...'; }, 4000);
	}

	// In demo mode, reduce debounce to 5 seconds
	const DEBOUNCE_MS = process.env.VEDA_DEMO_MODE === 'true' ? 5_000 : 30_000;

	// Register URI handler for OAuth callback
	const uriHandler = vscode.window.registerUriHandler({
		handleUri: async (uri: vscode.Uri) => {
			console.log('🔗 Veda Learn: Received URI callback:', uri.toString());

			try {
				if (uri.path === '/auth') {
					const params = new URLSearchParams(uri.query);
					const token = params.get('token');

					if (token) {
						console.log('✅ Veda Learn: JWT token received');
						await context.secrets.store('veda.jwt', token);

						// Update UI
						vscode.window.showInformationMessage('✅ Veda Learn: Successfully signed in!');
						statusBarItem.text = '$(check) Veda Learn: Connected';

						// Connect WebSocket
						await connectWebSocket(token);

						// Update sidebar
						VedaSidebarProvider.currentPanel?.updateAuthState(true);

					} else {
						throw new Error('No token received from OAuth callback');
					}
				}
			} catch (error) {
				console.error('❌ Veda Learn: OAuth callback error:', error);
				vscode.window.showErrorMessage(`❌ Veda Learn: Authentication failed - ${error}`);
				statusBarItem.text = '$(x) Auth Failed';
			}
		}
	});
	context.subscriptions.push(uriHandler);

	// Check if already authenticated on startup
	context.secrets.get('veda.jwt').then(async (token) => {
		if (token) {
			console.log('🔄 Veda Learn: Found existing token, reconnecting...');
			statusBarItem.text = '$(sync~spin) Veda Learn: Connecting...';
			try {
				await connectWebSocket(token);
				VedaSidebarProvider.currentPanel?.updateAuthState(true);
			} catch (err) {
				console.error('❌ Veda Learn: Stale token, clearing...', err);
				await context.secrets.delete('veda.jwt');
				statusBarItem.text = '$(eye) Veda watching...';
				VedaSidebarProvider.currentPanel?.updateAuthState(false);
			}
		}
	});

	// Register sidebar provider
	const sidebarProvider = new VedaSidebarProvider(context);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('veda.sidebar', sidebarProvider)
	);

	// Register commands
	const loginCommand = vscode.commands.registerCommand('veda.login', () => {
		sidebarProvider.initiateLogin();
	});

	const logoutCommand = vscode.commands.registerCommand('veda.logout', async () => {
		await context.secrets.delete('veda.jwt');
		if (ws) {
			ws.close();
			ws = null;
		}
		statusBarItem.text = '$(eye) Veda watching...';
		vscode.window.showInformationMessage('👋 Veda Learn: Signed out');
		VedaSidebarProvider.currentPanel?.updateAuthState(false);
	});

	context.subscriptions.push(loginCommand, logoutCommand);

	// Set up file watcher
	const debounceMap = new Map<string, NodeJS.Timeout>();

	vscode.workspace.onDidChangeTextDocument(event => {
		const uri = event.document.uri.toString();

		// Cancel any pending timer for this file
		clearTimeout(debounceMap.get(uri));

		// Start a new timer
		const timer = setTimeout(async () => {
			debounceMap.delete(uri);

			const jwt = await context.secrets.get('veda.jwt');
			if (!jwt) return;   // user not logged in — silently skip

			setStatusAnalyzing();

			// Build the analysis payload
			const payload = {
				fileContent: event.document.getText(),
				language: event.document.languageId,    // "python", "javascript", "typescript"
				fileName: event.document.fileName,
				cursorLine: vscode.window.activeTextEditor?.selection.active.line ?? 0,
				diagnostics: vscode.languages.getDiagnostics(event.document.uri)
					.map(d => ({
						message: d.message,
						severity: d.severity,
						line: d.range.start.line
					}))
			};

			try {
				const fetch = require('node-fetch');
				await fetch(`${REST_URL}/analyze`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${jwt}`
					},
					body: JSON.stringify(payload)
				});
			} catch (err) {
				console.error('❌ Veda Learn: Watcher fetch error:', err);
			}

		}, DEBOUNCE_MS);

		debounceMap.set(uri, timer);
	});

	console.log('✅ Veda Learn: Extension activated successfully');
}

async function connectWebSocket(token: string): Promise<void> {
	return new Promise((resolve, reject) => {
		try {
			// Close existing connection
			if (ws) {
				ws.close();
				ws = null;
			}

			console.log('🔌 Veda Learn: Connecting to WebSocket...');
			statusBarItem.text = '$(sync~spin) Veda Learn: Connecting...';

			const WebSocket = require('ws');
			ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);

			const connectionTimeout = setTimeout(() => {
				ws.close();
				reject(new Error('WebSocket connection timeout'));
			}, 10000); // 10 second timeout

			ws.on('open', () => {
				clearTimeout(connectionTimeout);
				console.log('✅ Veda Learn: WebSocket connected');
				statusBarItem.text = '$(eye) Veda watching...';
				vscode.window.showInformationMessage('🔗 Veda Learn: Real-time connection established');
				resolve();
			});

			ws.on('message', (data: Buffer) => {
				try {
					const message = JSON.parse(data.toString());
					console.log('📨 Veda Learn: Received message:', message);
					VedaSidebarProvider.currentPanel?.handleMessage(message);
				} catch (error) {
					console.error('❌ Veda Learn: Error parsing WebSocket message:', error);
				}
			});

			ws.on('close', (code: number, reason: string) => {
				clearTimeout(connectionTimeout);
				console.log(`🔌 Veda Learn: WebSocket closed (${code}: ${reason})`);
				statusBarItem.text = '$(sync) Veda Learn: Reconnecting...';

				// Reconnect after 5 seconds
				setTimeout(() => {
					if (ws === null) return; // Don't reconnect if manually closed
					connectWebSocket(token).catch(console.error);
				}, 5000);
			});

			ws.on('error', (error: Error) => {
				clearTimeout(connectionTimeout);
				console.error('❌ Veda Learn: WebSocket error:', error);
				statusBarItem.text = '$(x) Veda Learn: Connection Error';
				reject(error);
			});

		} catch (error) {
			console.error('❌ Veda Learn: Failed to create WebSocket:', error);
			statusBarItem.text = '$(x) Veda Learn: Connection Failed';
			reject(error);
		}
	});
}

let _context: vscode.ExtensionContext | undefined;

export function deactivate() {
	console.log('👋 Veda Learn: Extension deactivating...');
	if (ws) {
		ws.close();
		ws = null;
	}
	// Clear JWT on deactivate so uninstalling removes auth state
	if (_context) {
		_context.secrets.delete('veda.jwt').then(() => {
			console.log('🗑️ Veda Learn: JWT cleared on deactivate');
		});
	}
}

class VedaSidebarProvider implements vscode.WebviewViewProvider {
	static currentPanel: VedaSidebarProvider | undefined;
	private _view?: vscode.WebviewView;
	private _isAuthenticated = false;

	constructor(private readonly context: vscode.ExtensionContext) { }

	resolveWebviewView(webviewView: vscode.WebviewView) {
		VedaSidebarProvider.currentPanel = this;
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.context.extensionUri]
		};

		// Set initial HTML
		this.updateView();

		// Handle messages from webview
		webviewView.webview.onDidReceiveMessage(async (message) => {
			switch (message.type) {
				case 'login':
					this.initiateLogin();
					break;
				case 'logout':
					vscode.commands.executeCommand('veda.logout');
					break;
				default:
					console.log('🔔 Veda Learn: Unknown message type:', message.type);
			}
		});
	}

	initiateLogin() {
		try {
			console.log('🔐 Veda Learn: Initiating GitHub OAuth...');

			const redirectUri = encodeURIComponent(`${REST_URL}/auth/github/callback`);
			const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=user:email&state=vscode`;

			console.log('🌐 Veda Learn: Opening OAuth URL:', authUrl);
			vscode.env.openExternal(vscode.Uri.parse(authUrl));

			vscode.window.showInformationMessage('🔐 Veda Learn: Please complete GitHub authentication in your browser');

		} catch (error) {
			console.error('❌ Veda Learn: Failed to initiate login:', error);
			vscode.window.showErrorMessage(`❌ Veda Learn: Failed to start authentication - ${error}`);
		}
	}

	updateAuthState(isAuthenticated: boolean) {
		this._isAuthenticated = isAuthenticated;
		this.updateView();
	}

	handleMessage(message: any) {
		if (this._view) {
			this._view.webview.postMessage(message);
		}
	}

	private updateView() {
		if (this._view) {
			this._view.webview.html = this.getHtml();
		}
	}

	private getHtml(): string {
		const logoUri = this._view?.webview.asWebviewUri(
			vscode.Uri.joinPath(this.context.extensionUri, 'public', 'Extension-logo.png')
		);

		if (this._isAuthenticated) {
			return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#0d1117; color:#c9d1d9; font-family:'Inter',sans-serif; overflow-x:hidden; }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:4px; }
  .veda-btn { transition:all 0.18s ease; cursor:pointer; }
  .veda-btn:hover { opacity:0.85; transform:translateY(-1px); }
  .nav-tab { transition:all 0.18s ease; cursor:pointer; }
  .nav-tab:hover { background:rgba(255,255,255,0.06)!important; }
  @keyframes blink { 50%{opacity:0} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes breathe { 0%,100%{box-shadow:0 0 14px rgba(99,102,241,0.5)} 50%{box-shadow:0 0 28px rgba(99,102,241,0.7)} }
  @keyframes typewriter { from{width:0} to{width:100%} }

  /* Ambient glow */
  body::before { content:''; position:fixed; inset:0; pointer-events:none; z-index:0;
    background:radial-gradient(ellipse 60% 30% at 50% 0%,rgba(99,102,241,0.1) 0%,transparent 70%); }

  /* Header */
  .header { padding:14px 14px 10px; display:flex; align-items:center; justify-content:space-between;
    border-bottom:1px solid rgba(255,255,255,0.06); position:relative; z-index:2; }
  .logo-mark { width:32px; height:32px; border-radius:8px; overflow:hidden;
    animation:breathe 3s ease-in-out infinite; flex-shrink:0; }
  .logo-mark img { width:100%; height:100%; object-fit:cover; }
  .brand-name { font-size:14px; font-weight:700; color:#f1f5f9; }
  .brand-sub { font-size:9px; color:#6366f1; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; margin-top:-1px; }
  .status-pill { display:flex; align-items:center; gap:4px; padding:3px 8px; border-radius:100px;
    font-size:10px; font-weight:600; }
  .status-active { background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.25); color:#6ee7b7; }
  .status-active .dot { width:6px; height:6px; border-radius:50%; background:#10b981; box-shadow:0 0 6px #10b981; }
  .xp-pill { display:flex; align-items:center; gap:3px; padding:3px 7px; border-radius:100px;
    background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.2);
    font-size:10px; color:#fbbf24; font-weight:700; }

  /* Agent Mode Dropdown */
  .mode-bar { padding:6px 14px 8px; position:relative; z-index:2; }
  .mode-select { width:100%; padding:7px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.08);
    background:#161b27; color:#94a3b8; font-size:11px; font-family:'Inter',sans-serif; font-weight:500;
    cursor:pointer; outline:none; -webkit-appearance:none; appearance:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 10px center; padding-right:28px; }
  .mode-select:hover { border-color:rgba(99,102,241,0.4); }
  .mode-select:focus { border-color:#6366f1; box-shadow:0 0 0 2px rgba(99,102,241,0.15); }

  /* Nav Tabs */
  .nav { display:flex; gap:2px; padding:6px 12px 0; position:relative; z-index:2; }
  .nav button { flex:1; padding:7px 4px; border-radius:8px; border:none; background:transparent;
    color:#475569; font-size:10px; font-weight:400; cursor:pointer; display:flex; flex-direction:column;
    align-items:center; gap:2px; font-family:'Inter',sans-serif; border-bottom:2px solid transparent; }
  .nav button.active { background:rgba(99,102,241,0.18); border-bottom-color:#6366f1; color:#818cf8; font-weight:600; }

  /* Content */
  .content { flex:1; overflow-y:auto; padding:12px 12px 14px; position:relative; z-index:2; }
  .view { animation:slideUp 0.3s ease; }

  /* Code block */
  .code-card { background:#161b27; border-radius:10px; border:1px solid rgba(255,255,255,0.07);
    overflow:hidden; margin-bottom:12px; }
  .code-bar { padding:7px 12px; border-bottom:1px solid rgba(255,255,255,0.06);
    display:flex; align-items:center; gap:6px; }
  .code-dot { width:7px; height:7px; border-radius:50%; }
  .code-body { padding:10px 14px; }
  .code-body pre { margin:0; font-size:11px; line-height:1.8; font-family:'JetBrains Mono',monospace; color:#94a3b8; white-space:pre-wrap; }

  /* Detect button */
  .analyze-btn { width:100%; padding:11px; border-radius:10px; border:none;
    background:linear-gradient(135deg,#6366f1,#8b5cf6); color:white; font-size:13px;
    font-weight:600; cursor:pointer; box-shadow:0 4px 24px rgba(99,102,241,0.4);
    display:flex; align-items:center; justify-content:center; gap:8px; font-family:inherit; }

  /* Detection item */
  .detect-item { display:flex; align-items:center; gap:10px; padding:9px 11px; border-radius:9px;
    margin-bottom:6px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); cursor:pointer; }
  .detect-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }

  /* Streak */
  .streak-pill { margin-top:10px; padding:10px 12px; border-radius:10px;
    background:rgba(251,191,36,0.07); border:1px solid rgba(251,191,36,0.15);
    display:flex; align-items:center; gap:10px; }

  /* Lesson panels */
  .lesson-header { padding:11px 13px; border-radius:10px; margin-bottom:12px;
    background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.2);
    display:flex; align-items:flex-start; gap:10px; }
  .explain-box { padding:12px 13px; border-radius:10px; margin-bottom:12px;
    background:#161b27; border:1px solid rgba(255,255,255,0.07); }
  .section-label { font-size:10px; font-weight:700; color:#475569; letter-spacing:0.1em;
    text-transform:uppercase; margin-bottom:7px; }
  .code-block { border-radius:8px; padding:10px 14px; margin-bottom:8px;
    font-family:'JetBrains Mono','Fira Code',monospace; font-size:12px; line-height:1.7; }
  .code-before { background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.2); }
  .code-after { background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.25); }
  .code-label { font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
    padding:2px 7px; border-radius:4px; margin-bottom:6px; display:inline-block; }
  .diagram-row { display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:8px;
    margin-bottom:6px; animation:slideUp 0.35s ease backwards; }
  .quiz-btn { width:100%; padding:11px; border-radius:10px; border:none;
    background:linear-gradient(135deg,#f59e0b,#fbbf24); color:#0d1117; font-size:13px;
    font-weight:700; cursor:pointer; font-family:inherit; box-shadow:0 4px 20px rgba(251,191,36,0.3);
    display:flex; align-items:center; justify-content:center; gap:6px; }

  /* Quiz */
  .quiz-option { padding:10px 13px; border-radius:9px; margin-bottom:7px;
    background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); color:#94a3b8;
    font-size:12px; line-height:1.5; cursor:pointer; display:flex; align-items:center; gap:10px; }
  .quiz-option:hover { background:rgba(255,255,255,0.06); }
  .quiz-letter { width:20px; height:20px; border-radius:6px; background:rgba(255,255,255,0.07);
    display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700;
    color:#475569; flex-shrink:0; }
  .quiz-correct { background:rgba(16,185,129,0.12)!important; border-color:rgba(16,185,129,0.4)!important; color:#6ee7b7!important; }
  .quiz-wrong { background:rgba(239,68,68,0.1)!important; border-color:rgba(239,68,68,0.35)!important; color:#fca5a5!important; }

  /* Progress */
  .stats-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:14px; }
  .stat-card { padding:11px 10px; border-radius:10px; text-align:center;
    background:#161b27; border:1px solid rgba(255,255,255,0.07); }
  .bar-chart { display:flex; align-items:flex-end; gap:5px; height:48px; }
  .bar { flex:1; border-radius:4px; transition:height 0.6s cubic-bezier(.4,0,.2,1); }
  .progress-bar-track { background:rgba(255,255,255,0.06); border-radius:100px; height:5px; overflow:hidden; }
  .progress-bar-fill { height:100%; border-radius:100px; transition:width 1s cubic-bezier(.4,0,.2,1); }

  /* Footer */
  .footer { padding:10px 14px; border-top:1px solid rgba(255,255,255,0.05);
    display:flex; align-items:center; justify-content:space-between; position:relative; z-index:2; }
  .footer-avatar { width:22px; height:22px; border-radius:50%; background:linear-gradient(135deg,#6366f1,#8b5cf6);
    display:flex; align-items:center; justify-content:center; font-size:11px; color:white; }
  .footer-btn { width:26px; height:26px; border-radius:7px; background:rgba(255,255,255,0.04);
    border:1px solid rgba(255,255,255,0.07); color:#475569; font-size:12px; cursor:pointer;
    display:flex; align-items:center; justify-content:center; }

  /* Agent mode chat area */
  .agent-area { padding:12px; }
  .agent-input-wrap { display:flex; gap:8px; margin-top:12px; }
  .agent-input { flex:1; padding:9px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.1);
    background:#161b27; color:#e2e8f0; font-size:12px; font-family:inherit; outline:none; }
  .agent-input:focus { border-color:#6366f1; }
  .agent-send { padding:9px 14px; border-radius:8px; border:none; background:#6366f1; color:white;
    font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; }
  .agent-msg { padding:10px 12px; border-radius:9px; margin-bottom:8px; font-size:12px; line-height:1.6; }
  .agent-msg.user { background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.2); color:#c7d2fe; margin-left:20px; }
  .agent-msg.bot { background:#161b27; border:1px solid rgba(255,255,255,0.07); color:#94a3b8; margin-right:20px; }
</style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    <div style="display:flex;align-items:center;gap:10px">
      <div class="logo-mark"><img src="${logoUri}" alt="Veda"/></div>
      <div><div class="brand-name">Veda</div><div class="brand-sub">learn</div></div>
    </div>
    <div style="display:flex;align-items:center;gap:7px">
      <div class="status-pill status-active"><div class="dot"></div>Active</div>
      <div class="xp-pill">⚡ <span id="xpScore">847</span></div>
    </div>
  </div>

  <!-- AGENT MODE DROPDOWN -->
  <div class="mode-bar">
    <select class="mode-select" id="modeSelect" onchange="switchMode(this.value)">
      <option value="plan">🎯 Plan Mode</option>
      <option value="agent">🤖 Agent Mode</option>
    </select>
  </div>

  <!-- NAV TABS -->
  <div class="nav" id="navTabs">
    <button class="nav-tab active" data-view="detect" onclick="switchView('detect')">
      <span style="font-size:14px">⚡</span>Detect
    </button>
    <button class="nav-tab" data-view="lesson" onclick="switchView('lesson')">
      <span style="font-size:14px">📖</span>Lesson
    </button>
    <button class="nav-tab" data-view="quiz" onclick="switchView('quiz')">
      <span style="font-size:14px">🎯</span>Quiz
    </button>
    <button class="nav-tab" data-view="progress" onclick="switchView('progress')">
      <span style="font-size:14px">📈</span>Progress
    </button>
  </div>

  <!-- CONTENT -->
  <div class="content" id="mainContent">

    <!-- DETECT VIEW -->
    <div class="view" id="view-detect">
      <div class="code-card">
        <div class="code-bar">
          <div class="code-dot" style="background:#ef4444"></div>
          <div class="code-dot" style="background:#f59e0b"></div>
          <div class="code-dot" style="background:#10b981"></div>
          <span style="margin-left:6px;font-size:11px;color:#64748b;font-family:monospace" id="detectFile">cart.py</span>
          <span style="margin-left:auto;font-size:10px;color:#f59e0b;background:rgba(245,158,11,0.12);padding:2px 7px;border-radius:4px;font-weight:600" id="detectLine">⚠ Line 1</span>
        </div>
        <div class="code-body">
          <pre id="detectCode"><span style="color:#c084fc">def </span><span style="color:#60a5fa">add_item</span><span style="color:#f8fafc">(item, cart=</span><span style="color:#ef4444;background:rgba(239,68,68,0.12);padding:0 3px;border-radius:3px">[]</span><span style="color:#f8fafc">):
    cart.</span><span style="color:#60a5fa">append</span><span style="color:#f8fafc">(item)
    </span><span style="color:#c084fc">return </span><span style="color:#f8fafc">cart</span></pre>
        </div>
      </div>

      <button class="analyze-btn veda-btn" id="analyzeBtn" onclick="triggerAnalysis()">
        ⚡ Analyze Current File
      </button>

      <div style="margin-top:14px">
        <div class="section-label">Recent Detections</div>
        <div id="recentDetections">
          <div class="detect-item veda-btn" onclick="switchView('lesson')">
            <div class="detect-dot" style="background:#f59e0b;box-shadow:0 0 8px #f59e0b"></div>
            <div style="flex:1;min-width:0"><div style="font-size:12px;color:#e2e8f0;font-weight:500">Mutable Default Arg</div><div style="font-size:10px;color:#475569;font-family:monospace">cart.py</div></div>
            <span style="font-size:10px;color:#334155">2m ago</span>
          </div>
          <div class="detect-item veda-btn" onclick="switchView('lesson')">
            <div class="detect-dot" style="background:#ef4444;box-shadow:0 0 8px #ef4444"></div>
            <div style="flex:1;min-width:0"><div style="font-size:12px;color:#e2e8f0;font-weight:500">SQL Injection Risk</div><div style="font-size:10px;color:#475569;font-family:monospace">db.py</div></div>
            <span style="font-size:10px;color:#334155">1h ago</span>
          </div>
          <div class="detect-item veda-btn" onclick="switchView('lesson')">
            <div class="detect-dot" style="background:#6366f1;box-shadow:0 0 8px #6366f1"></div>
            <div style="flex:1;min-width:0"><div style="font-size:12px;color:#e2e8f0;font-weight:500">Unclosed Resource</div><div style="font-size:10px;color:#475569;font-family:monospace">io_utils.py</div></div>
            <span style="font-size:10px;color:#334155">3h ago</span>
          </div>
        </div>
      </div>

      <div class="streak-pill">
        <span style="font-size:20px">🔥</span>
        <div>
          <div style="font-size:12px;font-weight:600;color:#fbbf24">12-day learning streak</div>
          <div style="font-size:10px;color:#78716c">Keep it up — you're in the top 8%</div>
        </div>
      </div>
    </div>

    <!-- LESSON VIEW -->
    <div class="view" id="view-lesson" style="display:none">
      <div class="lesson-header">
        <span style="font-size:20px;margin-top:1px">⚠️</span>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700;color:#fbbf24" id="lessonConcept">Mutable Default Argument</div>
          <div style="font-size:10px;color:#78716c;margin-top:2px"><span style="color:#6366f1" id="lessonLang">Python</span> · <span id="lessonFile">cart.py</span> · Line <span id="lessonLine">1</span></div>
        </div>
        <button class="veda-btn" id="audioBtn" onclick="toggleAudio()" style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:white;font-size:14px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center">🔊</button>
      </div>

      <div class="explain-box">
        <div class="section-label">What's happening</div>
        <p id="explanationText" style="font-size:12px;line-height:1.75;color:#94a3b8">Using a mutable object like a list as a default argument is a classic Python trap. The default value is created once when the function is defined — not each time it's called. Every call without an argument shares the same list.</p>
      </div>

      <div style="margin-bottom:12px">
        <div class="section-label">Code comparison</div>
        <div class="code-block code-before">
          <div class="code-label" style="color:#ef4444;background:rgba(239,68,68,0.12)">Before</div>
          <pre style="margin:0;white-space:pre-wrap;color:#fecaca" id="codeBefore">def add_item(item, cart=[]):
    cart.append(item)
    return cart</pre>
        </div>
        <div class="code-block code-after">
          <div class="code-label" style="color:#10b981;background:rgba(16,185,129,0.12)">After</div>
          <pre style="margin:0;white-space:pre-wrap;color:#d1fae5" id="codeAfter">def add_item(item, cart=None):
    if cart is None:
        cart = []
    cart.append(item)
    return cart</pre>
        </div>
      </div>

      <div style="margin-bottom:14px">
        <div class="section-label">Execution diagram</div>
        <div id="diagramRows">
          <div class="diagram-row" style="background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.15);animation-delay:0.2s">
            <span style="width:7px;height:7px;border-radius:50%;background:#6366f1;box-shadow:0 0 8px #6366f1;flex-shrink:0"></span>
            <span style="font-size:11px;font-weight:700;color:#94a3b8;min-width:48px">Call 1</span>
            <span style="font-size:11px;font-family:monospace;color:#c7d2fe">cart=[] → cart=["apple"]</span>
          </div>
          <div class="diagram-row" style="background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.15);animation-delay:0.4s">
            <span style="width:7px;height:7px;border-radius:50%;background:#6366f1;box-shadow:0 0 8px #6366f1;flex-shrink:0"></span>
            <span style="font-size:11px;font-weight:700;color:#94a3b8;min-width:48px">Call 2</span>
            <span style="font-size:11px;font-family:monospace;color:#c7d2fe">cart=["apple"] → cart=["apple","banana"]</span>
          </div>
          <div class="diagram-row" style="background:rgba(16,185,129,0.07);border:1px solid rgba(16,185,129,0.2);animation-delay:0.6s">
            <span style="width:7px;height:7px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b981;flex-shrink:0"></span>
            <span style="font-size:11px;font-weight:700;color:#94a3b8;min-width:48px">Fix</span>
            <span style="font-size:11px;font-family:monospace;color:#6ee7b7">cart=None → cart=[] each call</span>
          </div>
        </div>
      </div>

      <button class="quiz-btn veda-btn" onclick="switchView('quiz')">🎯 Test Your Understanding</button>
    </div>

    <!-- QUIZ VIEW -->
    <div class="view" id="view-quiz" style="display:none">
      <div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:10px;color:#475569;font-weight:600;text-transform:uppercase;letter-spacing:0.08em" id="quizProgress">Question 1 of 2</span>
          <span style="font-size:10px;color:#6366f1" id="quizTopic">Mutable Default Args</span>
        </div>
        <div class="progress-bar-track"><div class="progress-bar-fill" id="quizBar" style="width:0%;background:linear-gradient(90deg,#6366f1,#8b5cf6)"></div></div>
      </div>
      <div class="explain-box" style="margin-bottom:12px">
        <p style="font-size:13px;line-height:1.65;color:#e2e8f0;font-weight:500" id="quizQuestion">Why is using [] as a default argument dangerous in Python?</p>
      </div>
      <div id="quizOptions">
        <div class="quiz-option veda-btn" onclick="answerQuiz(0)"><span class="quiz-letter">A</span>Lists are too slow as default values</div>
        <div class="quiz-option veda-btn" onclick="answerQuiz(1)"><span class="quiz-letter">B</span>The list is shared across all calls without explicit argument</div>
        <div class="quiz-option veda-btn" onclick="answerQuiz(2)"><span class="quiz-letter">C</span>Python doesn't allow lists as default arguments</div>
        <div class="quiz-option veda-btn" onclick="answerQuiz(3)"><span class="quiz-letter">D</span>It only fails in Python 2</div>
      </div>
      <div id="quizExplanation" style="display:none;padding:10px 13px;border-radius:9px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);font-size:11.5px;color:#a5b4fc;line-height:1.65;margin-top:8px;animation:fadeIn 0.3s ease"></div>
    </div>

    <!-- PROGRESS VIEW -->
    <div class="view" id="view-progress" style="display:none">
      <div class="stats-grid">
        <div class="stat-card"><div style="font-size:18px">⚡</div><div style="font-size:16px;font-weight:700;color:#fbbf24;margin-top:2px">847</div><div style="font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:0.08em">Skill Score</div></div>
        <div class="stat-card"><div style="font-size:18px">🔥</div><div style="font-size:16px;font-weight:700;color:#f97316;margin-top:2px">12d</div><div style="font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:0.08em">Streak</div></div>
        <div class="stat-card"><div style="font-size:18px">🧠</div><div style="font-size:16px;font-weight:700;color:#10b981;margin-top:2px">7</div><div style="font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:0.08em">Mastered</div></div>
      </div>
      <div style="margin-bottom:14px;padding:12px;border-radius:10px;background:#161b27;border:1px solid rgba(255,255,255,0.07)">
        <div class="section-label">Weekly Activity</div>
        <div class="bar-chart" id="weeklyChart"></div>
        <div style="display:flex;gap:5px;margin-top:4px">
          <span style="flex:1;text-align:center;font-size:9px;color:#334155">M</span>
          <span style="flex:1;text-align:center;font-size:9px;color:#334155">T</span>
          <span style="flex:1;text-align:center;font-size:9px;color:#334155">W</span>
          <span style="flex:1;text-align:center;font-size:9px;color:#334155">T</span>
          <span style="flex:1;text-align:center;font-size:9px;color:#334155">F</span>
          <span style="flex:1;text-align:center;font-size:9px;color:#334155">S</span>
          <span style="flex:1;text-align:center;font-size:9px;color:#334155">S</span>
        </div>
      </div>
      <div>
        <div class="section-label">Concept Mastery</div>
        <div id="conceptMastery"></div>
      </div>
      <div style="margin-top:8px;padding:11px 13px;border-radius:10px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);display:flex;align-items:center;gap:10px">
        <span style="font-size:20px">🎯</span>
        <div style="flex:1"><div style="font-size:11px;font-weight:600;color:#818cf8">Next focus area</div><div style="font-size:12px;color:#e2e8f0">Race Conditions in Go</div></div>
        <button class="veda-btn" onclick="switchView('lesson')" style="padding:6px 12px;border-radius:7px;border:none;background:#6366f1;color:white;font-size:11px;font-family:inherit;cursor:pointer;font-weight:600">Start</button>
      </div>
    </div>

    <!-- AGENT VIEW -->
    <div class="view agent-area" id="view-agent" style="display:none">
      <div class="section-label">AI Agent Chat</div>
      <div id="agentMessages" style="max-height:400px;overflow-y:auto;margin-top:8px">
        <div class="agent-msg bot">Hi! I'm Veda Agent. Ask me to write, refactor, or explain code. I'll help you learn while building.</div>
      </div>
      <div class="agent-input-wrap">
        <input class="agent-input" id="agentInput" placeholder="Ask Veda to help..." onkeydown="if(event.key==='Enter')sendAgent()"/>
        <button class="agent-send veda-btn" onclick="sendAgent()">Send</button>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div style="display:flex;align-items:center;gap:6px">
      <div class="footer-avatar">S</div>
      <span style="font-size:11px;color:#475569">suvam.paul</span>
    </div>
    <div style="display:flex;gap:6px">
      <button class="footer-btn veda-btn" title="Settings">⚙️</button>
      <button class="footer-btn veda-btn" title="Sign Out" onclick="logout()">🚪</button>
    </div>
  </div>

<script>
  const vscode = acquireVsCodeApi();
  let currentView = 'detect';
  let currentMode = 'plan';

  // Quiz state
  const quizData = [
    { q:"Why is using [] as a default argument dangerous in Python?", options:["Lists are too slow as default values","The list is shared across all calls without explicit argument","Python doesn't allow lists as default arguments","It only fails in Python 2"], correct:1, explanation:"The default object is evaluated once at function definition time and reused across all calls." },
    { q:"Which of these is the correct fix?", options:["def f(x, items=list())","def f(x, items=[]): items = []","def f(x, items=None): if items is None: items = []","def f(x, items=()): items = list(items)"], correct:2, explanation:"Using None as sentinel and creating the list inside the function guarantees a fresh list each call." }
  ];
  let quizIdx=0, quizAnswered=false, quizScore=0;

  function switchView(v) {
    currentView = v;
    document.querySelectorAll('.view').forEach(el => el.style.display='none');
    document.getElementById('view-'+v).style.display='block';
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    const tab = document.querySelector('.nav-tab[data-view="'+v+'"]');
    if(tab) tab.classList.add('active');
    if(v==='progress') renderProgress();
  }

  function switchMode(m) {
    currentMode = m;
    const nav = document.getElementById('navTabs');
    if(m==='agent') {
      nav.style.display='none';
      document.querySelectorAll('.view').forEach(el => el.style.display='none');
      document.getElementById('view-agent').style.display='block';
    } else {
      nav.style.display='flex';
      switchView(currentView === 'agent' ? 'detect' : currentView);
    }
    vscode.postMessage({type:'modeChange', mode:m});
  }

  function triggerAnalysis() {
    const btn = document.getElementById('analyzeBtn');
    btn.innerHTML = '<div style="width:14px;height:14px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 0.7s linear infinite"></div> Analyzing code...';
    vscode.postMessage({type:'analyze'});
    setTimeout(() => { btn.innerHTML = '⚡ Analyze Current File'; switchView('lesson'); }, 2200);
  }

  function toggleAudio() {
    const btn = document.getElementById('audioBtn');
    btn.textContent = btn.textContent === '🔊' ? '⏸' : '🔊';
  }

  function answerQuiz(i) {
    if(quizAnswered) return;
    quizAnswered = true;
    const q = quizData[quizIdx];
    const opts = document.querySelectorAll('#quizOptions .quiz-option');
    opts.forEach((o,idx) => {
      if(idx===q.correct) o.classList.add('quiz-correct');
      if(idx===i && idx!==q.correct) o.classList.add('quiz-wrong');
      o.style.cursor='default';
    });
    if(i===q.correct) quizScore++;
    const expl = document.getElementById('quizExplanation');
    expl.style.display='block';
    expl.textContent = '💡 ' + q.explanation;
    setTimeout(() => {
      if(quizIdx+1 < quizData.length) { quizIdx++; quizAnswered=false; renderQuiz(); }
      else renderQuizDone();
    }, 2000);
  }

  function renderQuiz() {
    const q = quizData[quizIdx];
    document.getElementById('quizProgress').textContent = 'Question '+(quizIdx+1)+' of '+quizData.length;
    document.getElementById('quizBar').style.width = ((quizIdx)/quizData.length*100)+'%';
    document.getElementById('quizQuestion').textContent = q.q;
    document.getElementById('quizExplanation').style.display='none';
    const container = document.getElementById('quizOptions');
    container.innerHTML = q.options.map((o,i) =>
      '<div class="quiz-option veda-btn" onclick="answerQuiz('+i+')"><span class="quiz-letter">'+String.fromCharCode(65+i)+'</span>'+o+'</div>'
    ).join('');
  }

  function renderQuizDone() {
    const c = document.getElementById('mainContent');
    const v = document.getElementById('view-quiz');
    const emoji = quizScore===quizData.length ? '🏆' : quizScore>0 ? '⭐' : '📚';
    const xp = quizScore===quizData.length ? '+15 XP · Concept mastered!' : '+5 XP · Keep practicing!';
    v.innerHTML = '<div style="text-align:center;padding:20px 10px;animation:slideUp 0.4s ease">'
      +'<div style="font-size:52px;margin-bottom:12px">'+emoji+'</div>'
      +'<div style="font-size:22px;font-weight:700;color:#f1f5f9;margin-bottom:4px">'+quizScore+'/'+quizData.length+' Correct</div>'
      +'<div style="font-size:12px;color:#6ee7b7;margin-bottom:20px">'+xp+'</div>'
      +'<div style="display:flex;gap:8px;justify-content:center">'
      +'<button class="veda-btn" onclick="resetQuiz()" style="padding:9px 18px;border-radius:9px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#94a3b8;font-size:12px;font-family:inherit;cursor:pointer">Retry</button>'
      +'<button class="veda-btn" onclick="switchView(\'progress\')" style="padding:9px 18px;border-radius:9px;border:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;font-size:12px;font-family:inherit;cursor:pointer">View Progress →</button>'
      +'</div></div>';
  }

  function resetQuiz() { quizIdx=0; quizAnswered=false; quizScore=0; location.reload(); }

  function renderProgress() {
    const data = [5,3,7,4,6,8,5];
    const chart = document.getElementById('weeklyChart');
    if(!chart) return;
    chart.innerHTML = data.map((v,i) =>
      '<div class="bar" style="height:'+((v/10)*40)+'px;background:'+(i===6?'linear-gradient(180deg,#6366f1,#8b5cf6)':'rgba(99,102,241,0.25)')+';'+(i===6?'box-shadow:0 0 12px rgba(99,102,241,0.4)':'')+';"></div>'
    ).join('');
    const concepts = [
      {name:"Mutable Default Args",mastery:82,lang:"Python",color:"#6366f1"},
      {name:"SQL Injection",mastery:65,lang:"Python",color:"#f59e0b"},
      {name:"Null Reference",mastery:44,lang:"JavaScript",color:"#10b981"},
      {name:"Race Conditions",mastery:28,lang:"Go",color:"#ef4444"}
    ];
    const mc = document.getElementById('conceptMastery');
    if(!mc) return;
    mc.innerHTML = concepts.map(c =>
      '<div style="margin-bottom:11px"><div style="display:flex;justify-content:space-between;margin-bottom:5px"><div><span style="font-size:12px;color:#e2e8f0;font-weight:500">'+c.name+'</span><span style="font-size:10px;color:#475569;margin-left:6px;font-family:monospace">'+c.lang+'</span></div><span style="font-size:11px;font-weight:700;color:'+c.color+'">'+c.mastery+'%</span></div><div class="progress-bar-track"><div class="progress-bar-fill" style="width:'+c.mastery+'%;background:linear-gradient(90deg,'+c.color+','+c.color+'cc);box-shadow:0 0 10px '+c.color+'80"></div></div></div>'
    ).join('');
  }

  function sendAgent() {
    const input = document.getElementById('agentInput');
    const msg = input.value.trim();
    if(!msg) return;
    const container = document.getElementById('agentMessages');
    container.innerHTML += '<div class="agent-msg user">'+msg+'</div>';
    input.value = '';
    vscode.postMessage({type:'agentMessage', message:msg});
    setTimeout(() => {
      container.innerHTML += '<div class="agent-msg bot">I received your message. Agent mode is being developed — stay tuned!</div>';
      container.scrollTop = container.scrollHeight;
    }, 800);
  }

  function logout() { vscode.postMessage({type:'logout'}); }

  // Listen for WebSocket messages from extension
  window.addEventListener('message', event => {
    const msg = event.data;
    if(msg.type==='lesson' && msg.lesson) {
      const l = msg.lesson;
      if(l.conceptId) document.getElementById('lessonConcept').textContent = l.conceptId.replace(/-/g,' ').replace(/\\b\\w/g,c=>c.toUpperCase());
      if(l.explanation) document.getElementById('explanationText').textContent = l.explanation;
      if(l.codeBefore) document.getElementById('codeBefore').textContent = l.codeBefore;
      if(l.codeAfter) document.getElementById('codeAfter').textContent = l.codeAfter;
      switchView('lesson');
    }
  });

  renderProgress();
</script>
</body></html>`;
		} else {
			return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#0d1117; color:#c9d1d9; font-family:'Inter',sans-serif;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    height:100vh; text-align:center; position:relative; overflow:hidden; }
  body::before { content:''; position:fixed; inset:0; pointer-events:none;
    background:radial-gradient(ellipse 60% 30% at 50% 0%,rgba(99,102,241,0.12) 0%,transparent 70%); }
  .logo { width:72px; height:72px; border-radius:16px; margin-bottom:20px; overflow:hidden;
    box-shadow:0 0 40px rgba(99,102,241,0.3); animation:breathe 3s ease-in-out infinite; }
  .logo img { width:100%; height:100%; object-fit:cover; }
  .title { font-size:24px; font-weight:700; color:#f1f5f9; margin-bottom:4px; }
  .sub { font-size:12px; color:#6366f1; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; margin-bottom:16px; }
  .desc { font-size:12px; color:#64748b; max-width:260px; line-height:1.5; margin-bottom:24px; }
  .login-btn { padding:12px 28px; border-radius:10px; border:none;
    background:linear-gradient(135deg,#6366f1,#8b5cf6); color:white; font-size:14px;
    font-weight:600; cursor:pointer; font-family:inherit;
    box-shadow:0 4px 24px rgba(99,102,241,0.4); transition:all 0.2s ease; }
  .login-btn:hover { transform:translateY(-2px); box-shadow:0 6px 32px rgba(99,102,241,0.5); }
  @keyframes breathe { 0%,100%{box-shadow:0 0 20px rgba(99,102,241,0.3)} 50%{box-shadow:0 0 40px rgba(99,102,241,0.6)} }
</style>
</head>
<body>
  <div class="logo"><img src="${logoUri}" alt="Veda"/></div>
  <div class="title">Veda Learn</div>
  <div class="sub">AI Coding Mentor</div>
  <div class="desc">Get real-time code analysis, personalized lessons, and interactive quizzes to improve your programming skills.</div>
  <button class="login-btn" onclick="login()">🔐 Sign in with GitHub</button>
  <script>
    const vscode = acquireVsCodeApi();
    function login() { vscode.postMessage({type:'login'}); }
  </script>
</body></html>`;
		}
	}
}
