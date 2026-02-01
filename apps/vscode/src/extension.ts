import * as vscode from 'vscode';
import { DarDocsEditorProvider } from './DarDocsEditorProvider';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(DarDocsEditorProvider.register(context));
}

export function deactivate() {}
