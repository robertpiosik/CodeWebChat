import * as vscode from 'vscode'

export class SettingsProvider {
  private _panel: vscode.WebviewPanel | undefined
  private readonly _disposables: vscode.Disposable[] = []

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public createOrShow() {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined

    if (this._panel) {
      this._panel.reveal(column)
      return
    }

    this._panel = vscode.window.createWebviewPanel(
      'codeWebChatSettings',
      'Settings Beta',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'out')]
      }
    )

    this._panel.onDidDispose(
      () => {
        this._panel = undefined
        this._disposables.forEach((d) => d.dispose())
      },
      null,
      this._disposables
    )

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview)

    this._panel.webview.onDidReceiveMessage(
      (message) => {
        // Handle messages from webview
      },
      null,
      this._disposables
    )
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'settings.js')
    )
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'settings.css')
    )

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="${styleUri}">
      <title>Settings Beta</title>
    </head>
    <body>
      <div id="root"></div>
      <script src="${scriptUri}"></script>
    </body>
    </html>
  `
  }
}
