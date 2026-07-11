import * as vscode from 'vscode'

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

  const resources_uri = params.webview.asWebviewUri(
    vscode.Uri.joinPath(params.extension_uri, 'resources')
  )
  const resources_script = `\n  <script>\n    window.resources_uri = "${resources_uri}";\n  </script>`

  const overflow_style = params.overflow_hidden ? '\n    body {  }' : ''

  const title_tag = params.title ? `\n  <title>${params.title}</title>` : ''

  return `<!DOCTYPE html>
<html lang="${vscode.env.language}">
<head>
  <meta charset="UTF-8">
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
  <script src="${script_uri}"></script>
</body>
</html>`
}
