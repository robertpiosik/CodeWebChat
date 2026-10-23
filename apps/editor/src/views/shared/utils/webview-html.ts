import * as vscode from 'vscode'

function getNonce() {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

export const webview_html = (params: {
  webview: vscode.Webview
  extension_uri: vscode.Uri
  name: string
  title?: string
  overflow_hidden?: boolean
}) => {
  const script_uri = params.webview.asWebviewUri(
    vscode.Uri.joinPath(params.extension_uri, 'out', `${params.name}.js`)
  )

  const style_uri = params.webview.asWebviewUri(
    vscode.Uri.joinPath(params.extension_uri, 'out', `${params.name}.css`)
  )

  const bangers_font_uri = params.webview.asWebviewUri(
    vscode.Uri.joinPath(
      params.extension_uri,
      'resources',
      'Bangers-Regular.ttf'
    )
  )

  const nonce = getNonce()

  const resources_uri = params.webview.asWebviewUri(
    vscode.Uri.joinPath(params.extension_uri, 'resources')
  )
  const resources_script = `\n  <script nonce="${nonce}">\n    window.resources_uri = "${resources_uri}";\n  </script>`

  const overflow_style = params.overflow_hidden ? '\n    body {  }' : ''

  const title_tag = params.title ? `\n  <title>${params.title}</title>` : ''
  const csp_source = params.webview.cspSource

  return `<!DOCTYPE html>
<html lang="${vscode.env.language}">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${csp_source} https: data: blob:; script-src 'nonce-${nonce}' ${csp_source} 'unsafe-eval'; style-src ${csp_source} 'unsafe-inline'; font-src ${csp_source} data:; connect-src ${csp_source} https: http: ws: wss:; worker-src ${csp_source} blob: data:; media-src ${csp_source} data:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${style_uri}">${resources_script}
  <style>
    @font-face {
      font-family: 'Bangers';
      src: url('${bangers_font_uri}') format('truetype');
    }${overflow_style}
  </style>${title_tag}
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${script_uri}"></script>
</body>
</html>`
}
