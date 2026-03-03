import * as vscode from 'vscode';
import { CodeWatcher } from './services/CodeWatcher';
import { AuthProvider } from './auth/AuthProvider';
import { VedaSidebarProvider } from './webview/VedaSidebarProvider';

let statusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext) {
  console.log('🎓 Veda Learn extension activating...');

  const authProvider = new AuthProvider(context);
  const sidebarProvider = new VedaSidebarProvider(context, authProvider);
  
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('veda.sidebar', sidebarProvider)
  );

  const codeWatcher = new CodeWatcher(context, authProvider);
  codeWatcher.start();

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(eye) Veda watching...';
  context.subscriptions.push(statusBarItem);

  authProvider.onAuthStateChanged((isAuthenticated) => {
    if (isAuthenticated) {
      statusBarItem.show();
    } else {
      statusBarItem.hide();
    }
  });

  const isAuthenticated = await authProvider.isAuthenticated();
  if (isAuthenticated) {
    statusBarItem.show();
  }

  console.log('✅ Veda Learn extension activated');
}

export function deactivate() {
  console.log('👋 Veda Learn extension deactivating...');
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}
