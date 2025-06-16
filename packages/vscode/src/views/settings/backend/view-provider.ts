import * as vscode from 'vscode'

export class SettingsViewProvider {
  public static current_panel: vscode.WebviewPanel | undefined
  private static readonly view_type = 'codeWebChatSettings'

  public static create_or_show(extension_uri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined

    if (SettingsViewProvider.current_panel) {
      SettingsViewProvider.current_panel.reveal(column)
      return
    }

    const panel = vscode.window.createWebviewPanel(
      SettingsViewProvider.view_type,
      'CWC Settings',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extension_uri]
      }
    )

    SettingsViewProvider.current_panel = panel
    panel.onDidDispose(
      () => {
        SettingsViewProvider.current_panel = undefined
      },
      null,
      []
    )
    panel.webview.html = this._get_html_for_webview(
      panel.webview,
      extension_uri
    )
  }

  private static _get_html_for_webview(
    webview: vscode.Webview,
    extension_uri: vscode.Uri
  ) {
    const resources_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(extension_uri, 'resources')
    )

    const script_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(extension_uri, 'out', 'settings.js')
    )

    const style_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(extension_uri, 'out', 'settings.css')
    )

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="${style_uri}">
        <script>
          window.resources_uri = "${resources_uri}";
        </script>
        <style>
          body {
            overflow: hidden;
          }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script src="${script_uri}"></script>
      </body>
      </html>
    `
  }
}
