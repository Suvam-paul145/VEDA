import * as vscode from 'vscode';
import axios from 'axios';
import { AuthProvider } from '../auth/AuthProvider';

export class CodeWatcher {
  private context: vscode.ExtensionContext;
  private authProvider: AuthProvider;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext, authProvider: AuthProvider) {
    this.context = context;
    this.authProvider = authProvider;
  }

  start(): void {
    const changeListener = vscode.workspace.onDidChangeTextDocument(
      this.onDocumentChange.bind(this)
    );
    this.disposables.push(changeListener);
  }

  private async onDocumentChange(event: vscode.TextDocumentChangeEvent): Promise<void> {
    const document = event.document;

    const isAuthenticated = await this.authProvider.isAuthenticated();
    if (!isAuthenticated) {
      return;
    }

    if (document.uri.scheme !== 'file' || document.languageId === 'plaintext') {
      return;
    }

    const uri = document.uri.toString();

    const existingTimer = this.debounceTimers.get(uri);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const config = vscode.workspace.getConfiguration('veda');
    const demoMode = config.get<boolean>('demoMode', false);
    const debounceMs = demoMode ? 5000 : 30000;

    const timer = setTimeout(() => {
      this.analyzeCode(document);
      this.debounceTimers.delete(uri);
    }, debounceMs);

    this.debounceTimers.set(uri, timer);
  }

  private async analyzeCode(document: vscode.TextDocument): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('veda');
      const apiUrl = config.get<string>('apiUrl', 'http://localhost:3000');
      const token = await this.authProvider.getToken();

      if (!token) {
        return;
      }

      const editor = vscode.window.activeTextEditor;
      const lineNumber = editor?.selection.active.line ?? 0;

      const diagnostics = vscode.languages.getDiagnostics(document.uri);
      const diagnosticsData = diagnostics.map(d => ({
        message: d.message,
        severity: d.severity
      }));

      const payload = {
        code: document.getText().substring(0, 3000),
        language: document.languageId,
        fileName: document.fileName,
        lineNumber,
        diagnostics: diagnosticsData
      };

      const response = await axios.post(`${apiUrl}/api/analyze`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.teach) {
        console.log('📚 Lesson triggered:', response.data.mistakeId);
      }
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.log('⏱️ Rate limited, slowing down...');
      } else {
        console.error('Analysis error:', error.message);
      }
    }
  }

  dispose(): void {
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.disposables.forEach(d => d.dispose());
  }
}
