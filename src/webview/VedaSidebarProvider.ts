import * as vscode from 'vscode';
import { AuthProvider } from '../auth/AuthProvider';

export class VedaSidebarProvider implements vscode.WebviewViewProvider {
  private context: vscode.ExtensionContext;
  private authProvider: AuthProvider;
  private view?: vscode.WebviewView;

  constructor(context: vscode.ExtensionContext, authProvider: AuthProvider) {
    this.context = context;
    this.authProvider = authProvider;
  }

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): Promise<void> {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri]
    };

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'login':
          await this.authProvider.loginWithGitHub();
          this.updateView();
          break;
        case 'logout':
          await this.authProvider.logout();
          this.updateView();
          break;
      }
    });

    await this.updateView();
  }

  private async updateView(): Promise<void> {
    if (!this.view) return;

    const isAuthenticated = await this.authProvider.isAuthenticated();
    const user = await this.authProvider.getUser();

    if (isAuthenticated && user) {
      this.view.webview.html = this.getAuthenticatedHtml(user);
    } else {
      this.view.webview.html = this.getLoginHtml();
    }
  }

  private getLoginHtml(): string {
    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          padding: 20px;
          font-family: var(--vscode-font-family);
          color: var(--vscode-foreground);
        }
        .container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        button {
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          padding: 10px 20px;
          cursor: pointer;
          border-radius: 4px;
        }
        button:hover {
          background: var(--vscode-button-hoverBackground);
        }
        h2 {
          margin: 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>🎓 Welcome to Veda Learn</h2>
        <p>AI that makes you better, not just faster</p>
        <button onclick="login()">Login with GitHub</button>
      </div>
      <script>
        const vscode = acquireVsCodeApi();
        function login() {
          vscode.postMessage({ command: 'login' });
        }
      </script>
    </body>
    </html>`;
  }

  private getAuthenticatedHtml(user: any): string {
    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          padding: 20px;
          font-family: var(--vscode-font-family);
          color: var(--vscode-foreground);
        }
        .profile {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
        }
        .avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
        }
        .stats {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .stat {
          display: flex;
          justify-content: space-between;
          padding: 8px;
          background: var(--vscode-editor-background);
          border-radius: 4px;
        }
        button {
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          padding: 8px 16px;
          cursor: pointer;
          border-radius: 4px;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="profile">
        <img class="avatar" src="${user.avatar_url || ''}" alt="Avatar">
        <div>
          <h3>${user.username}</h3>
        </div>
      </div>
      <div class="stats">
        <div class="stat">
          <span>Skill Score</span>
          <span>${user.skill_score}/100</span>
        </div>
        <div class="stat">
          <span>Streak 🔥</span>
          <span>${user.streak_days} days</span>
        </div>
      </div>
      <button onclick="logout()">Logout</button>
      <script>
        const vscode = acquireVsCodeApi();
        function logout() {
          vscode.postMessage({ command: 'logout' });
        }
      </script>
    </body>
    </html>`;
  }
}
