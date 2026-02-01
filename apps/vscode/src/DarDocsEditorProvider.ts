import * as vscode from 'vscode';

export class DarDocsEditorProvider implements vscode.CustomTextEditorProvider {
  private static readonly viewType = 'dardocs.editor';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new DarDocsEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(
      DarDocsEditorProvider.viewType,
      provider,
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false,
      }
    );
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview'),
      ],
    };

    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // Send initial document content to webview
    const sendDocument = () => {
      webviewPanel.webview.postMessage({
        type: 'load',
        content: document.getText(),
      });
    };

    // Wait for webview to signal ready, then send document
    const messageDisposable = webviewPanel.webview.onDidReceiveMessage((msg) => {
      switch (msg.type) {
        case 'ready':
          sendDocument();
          break;

        case 'edit': {
          const edit = new vscode.WorkspaceEdit();
          edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            msg.content
          );
          vscode.workspace.applyEdit(edit);
          break;
        }
      }
    });

    // When the file changes externally (git checkout, other editor), update webview
    const changeDisposable = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString() && e.contentChanges.length > 0) {
        sendDocument();
      }
    });

    webviewPanel.onDidDispose(() => {
      messageDisposable.dispose();
      changeDisposable.dispose();
    });
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'index.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'index.css')
    );

    const nonce = getNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'none';
    style-src ${webview.cspSource} 'unsafe-inline';
    script-src 'nonce-${nonce}';
    font-src ${webview.cspSource};
    img-src ${webview.cspSource} data: blob:;
  ">
  <link rel="stylesheet" href="${styleUri}">
  <title>DarDocs</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
