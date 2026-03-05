import * as vscode from 'vscode';

const REST_URL = 'https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev';
const WS_URL = 'wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev';

let ws: any = null;

export function activate(context: vscode.ExtensionContext) {
	console.log('Veda Learn activating...');

	// 1. Register URI handler for OAuth redirect
	vscode.window.registerUriHandler({
		handleUri: async (uri: vscode.Uri) => {
			if (uri.path === '/auth') {
				const params = new URLSearchParams(uri.query);
				const token = params.get('token');
				if (token) {
					await context.secrets.store('veda.jwt', token);
					vscode.window.showInformationMessage('✅ Veda Learn — Signed in!');
					connectWebSocket(context, token);
				}
			}
		}
	});

	// 2. On startup, if already signed in, reconnect WebSocket
	context.secrets.get('veda.jwt').then((token) => {
		if (token) connectWebSocket(context, token);
	});

	// 3. Status bar item
	const statusBar = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right, 100
	);
	statusBar.text = '$(eye) Veda watching...';
	statusBar.tooltip = 'Veda Learn is monitoring your code';
	statusBar.show();
	context.subscriptions.push(statusBar);

	// 4. Register the sidebar webview provider
	const provider = new VedaSidebarProvider(context);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('veda.sidebar', provider)
	);
}

function connectWebSocket(context: vscode.ExtensionContext, token: string) {
	const WebSocket = require('ws');
	if (ws) { try { ws.close(); } catch (_) { } }

	ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);

	ws.on('open', () => console.log('Veda WS connected'));

	ws.on('message', (data: Buffer) => {
		const msg = JSON.parse(data.toString());
		// Forward lesson to sidebar webview
		VedaSidebarProvider.currentPanel?.sendMessage(msg);
	});

	ws.on('close', () => {
		console.log('Veda WS closed, reconnecting in 5s...');
		setTimeout(() => connectWebSocket(context, token), 5000);
	});

	ws.on('error', (err: Error) => console.error('Veda WS error:', err.message));
}

export function deactivate() {
	if (ws) ws.close();
}

class VedaSidebarProvider implements vscode.WebviewViewProvider {
	static currentPanel: VedaSidebarProvider | undefined;
	private _view?: vscode.WebviewView;

	constructor(private readonly context: vscode.ExtensionContext) { }

	sendMessage(msg: any) {
		this._view?.webview.postMessage(msg);
	}

	resolveWebviewView(webviewView: vscode.WebviewView) {
		VedaSidebarProvider.currentPanel = this;
		this._view = webviewView;
		webviewView.webview.options = { enableScripts: true };
		webviewView.webview.html = this.getHtml();

		webviewView.webview.onDidReceiveMessage(async (msg) => {
			if (msg.type === 'login') {
				const authUrl = `${REST_URL}/auth/github`;
				vscode.env.openExternal(vscode.Uri.parse(authUrl));
			}
		});
	}

	getHtml() {
		return `<!DOCTYPE html>
<html>
<head>
<style>
  body { background: #1e1e1e; color: #ccc; font-family: sans-serif;
         display: flex; flex-direction: column; align-items: center;
         justify-content: center; height: 100vh; margin: 0; }
  button { background: #7c3aed; color: white; border: none; padding: 10px 20px;
           border-radius: 6px; cursor: pointer; font-size: 14px; margin-top: 16px; }
  button:hover { background: #6d28d9; }
  .logo { font-size: 32px; margin-bottom: 8px; }
  .title { font-size: 18px; font-weight: bold; color: #e6edf3; }
  .sub { font-size: 12px; color: #6e7681; margin-top: 4px; }
</style>
</head>
<body>
  <div class="logo">⬡</div>
  <div class="title">Veda Learn</div>
  <div class="sub">Your passive AI coding mentor</div>
  <button onclick="login()">Sign in with GitHub</button>
  <script>
    const vscode = acquireVsCodeApi();
    function login() { vscode.postMessage({ type: 'login' }); }
    window.addEventListener('message', e => {
      const msg = e.data;
      if (msg.type === 'lesson') {
        document.body.innerHTML = '<pre style="color:#a78bfa;padding:20px">' +
          JSON.stringify(msg.lesson, null, 2) + '</pre>';
      }
    });
  </script>
</body>
</html>`;
	}
}
