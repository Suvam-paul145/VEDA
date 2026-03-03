import * as vscode from 'vscode';
import axios from 'axios';

export interface User {
  id: string;
  username: string;
  email: string | null;
  avatar_url: string | null;
  skill_score: number;
  streak_days: number;
}

export class AuthProvider {
  private context: vscode.ExtensionContext;
  private authStateListeners: ((isAuthenticated: boolean) => void)[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  async getToken(): Promise<string | undefined> {
    return await this.context.secrets.get('veda.jwt');
  }

  async getUser(): Promise<User | undefined> {
    const userJson = this.context.globalState.get<string>('veda.user');
    if (!userJson) return undefined;
    return JSON.parse(userJson);
  }

  async loginWithGitHub(): Promise<void> {
    const config = vscode.workspace.getConfiguration('veda');
    const apiUrl = config.get<string>('apiUrl', 'http://localhost:3000');

    try {
      const authUrl = `${apiUrl}/auth/github`;
      await vscode.env.openExternal(vscode.Uri.parse(authUrl));

      const token = await vscode.window.showInputBox({
        prompt: 'Paste your authentication token from the browser',
        password: true,
        ignoreFocusOut: true
      });

      if (!token) {
        throw new Error('Authentication cancelled');
      }

      const response = await axios.get(`${apiUrl}/api/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const user = response.data;

      await this.context.secrets.store('veda.jwt', token);
      await this.context.globalState.update('veda.user', JSON.stringify(user));

      this.notifyAuthStateChanged(true);

      vscode.window.showInformationMessage(`Welcome, ${user.username}! 🎓`);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Login failed: ${error.message}`);
      throw error;
    }
  }

  async logout(): Promise<void> {
    await this.context.secrets.delete('veda.jwt');
    await this.context.globalState.update('veda.user', undefined);
    this.notifyAuthStateChanged(false);
    vscode.window.showInformationMessage('Logged out successfully');
  }

  onAuthStateChanged(listener: (isAuthenticated: boolean) => void): void {
    this.authStateListeners.push(listener);
  }

  private notifyAuthStateChanged(isAuthenticated: boolean): void {
    this.authStateListeners.forEach(listener => listener(isAuthenticated));
  }
}
