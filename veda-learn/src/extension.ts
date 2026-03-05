import * as vscode from 'vscode';

const REST_URL = 'https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev';
const WS_URL = 'wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev';
const GITHUB_CLIENT_ID = 'Ov23liUfaTgayCi8bO5n';

let ws: any = null;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
	console.log('🚀 Veda Learn: Extension activating...');

	// Initialize status bar
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = '$(eye) Veda Learn';
	statusBarItem.tooltip = 'Veda Learn - AI Coding Mentor';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

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
				statusBarItem.text = '$(x) Veda Learn: Auth Failed';
			}
		}
	});
	context.subscriptions.push(uriHandler);

	// Check if already authenticated on startup
	context.secrets.get('veda.jwt').then(async (token) => {
		if (token) {
			console.log('🔄 Veda Learn: Found existing token, reconnecting...');
			statusBarItem.text = '$(sync~spin) Veda Learn: Connecting...';
			await connectWebSocket(token);
			VedaSidebarProvider.currentPanel?.updateAuthState(true);
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
		statusBarItem.text = '$(eye) Veda Learn';
		vscode.window.showInformationMessage('👋 Veda Learn: Signed out');
		VedaSidebarProvider.currentPanel?.updateAuthState(false);
	});

	context.subscriptions.push(loginCommand, logoutCommand);
	
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
				statusBarItem.text = '$(check) Veda Learn: Connected';
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

export function deactivate() {
	console.log('👋 Veda Learn: Extension deactivating...');
	if (ws) {
		ws.close();
		ws = null;
	}
}

class VedaSidebarProvider implements vscode.WebviewViewProvider {
	static currentPanel: VedaSidebarProvider | undefined;
	private _view?: vscode.WebviewView;
	private _isAuthenticated = false;

	constructor(private readonly context: vscode.ExtensionContext) {}

	resolveWebviewView(webviewView: vscode.WebviewView) {
		VedaSidebarProvider.currentPanel = this;
		this._view = webviewView;
		
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: []
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
		if (this._isAuthenticated) {
			return `<!DOCTYPE html>
<html>
<head>
<style>
  body { background: #1e1e1e; color: #ccc; font-family: sans-serif; padding: 20px; margin: 0; }
  .header { text-align: center; margin-bottom: 20px; }
  .logo { font-size: 32px; margin-bottom: 8px; }
  .title { font-size: 18px; font-weight: bold; color: #e6edf3; }
  .status { font-size: 12px; color: #22c55e; margin-top: 4px; }
  .content { margin-top: 20px; }
  .lesson-area { background: #2d2d2d; border-radius: 6px; padding: 15px; margin-top: 15px; }
  button { background: #dc2626; color: white; border: none; padding: 8px 16px;
           border-radius: 4px; cursor: pointer; font-size: 12px; }
  button:hover { background: #b91c1c; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">⬡</div>
    <div class="title">Veda Learn</div>
    <div class="status">✅ Connected & Monitoring</div>
  </div>
  
  <div class="content">
    <p>🎯 Veda is now watching your code and will provide:</p>
    <ul>
      <li>Real-time code analysis</li>
      <li>Personalized lessons</li>
      <li>Interactive quizzes</li>
      <li>Progress tracking</li>
    </ul>
    
    <div class="lesson-area" id="lessonArea">
      <em>Lessons and feedback will appear here...</em>
    </div>
    
    <button onclick="logout()" style="margin-top: 15px;">Sign Out</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    function logout() {
      vscode.postMessage({ type: 'logout' });
    }
    
    window.addEventListener('message', event => {
      const message = event.data;
      const lessonArea = document.getElementById('lessonArea');
      
      if (message.type === 'lesson' && lessonArea) {
        lessonArea.innerHTML = '<h4>📚 New Lesson</h4><pre>' + 
          JSON.stringify(message.lesson, null, 2) + '</pre>';
      } else if (message.type === 'analysis' && lessonArea) {
        lessonArea.innerHTML = '<h4>🔍 Code Analysis</h4><pre>' + 
          JSON.stringify(message.analysis, null, 2) + '</pre>';
      }
    });
  </script>
</body>
</html>`;
		} else {
			return `<!DOCTYPE html>
<html>
<head>
<style>
  body { background: #1e1e1e; color: #ccc; font-family: sans-serif;
         display: flex; flex-direction: column; align-items: center;
         justify-content: center; height: 100vh; margin: 0; text-align: center; }
  button { background: #7c3aed; color: white; border: none; padding: 12px 24px;
           border-radius: 6px; cursor: pointer; font-size: 14px; margin-top: 20px;
           transition: background-color 0.2s; }
  button:hover { background: #6d28d9; }
  .logo { font-size: 48px; margin-bottom: 16px; }
  .title { font-size: 24px; font-weight: bold; color: #e6edf3; margin-bottom: 8px; }
  .subtitle { font-size: 14px; color: #6e7681; margin-bottom: 8px; }
  .description { font-size: 12px; color: #8b949e; max-width: 280px; line-height: 1.4; }
</style>
</head>
<body>
  <div class="logo">⬡</div>
  <div class="title">Veda Learn</div>
  <div class="subtitle">AI Coding Mentor</div>
  <div class="description">
    Get real-time code analysis, personalized lessons, and interactive quizzes 
    to improve your programming skills.
  </div>
  <button onclick="login()">🔐 Sign in with GitHub</button>
  
  <script>
    const vscode = acquireVsCodeApi();
    function login() { 
      vscode.postMessage({ type: 'login' }); 
    }
  </script>
</body>
</html>`;
		}
	}
}
