import * as vscode from 'vscode'
import { OpenWebsiteMessage } from '../../types/messages'
import * as fs from 'fs'
import { get_website_file_path } from '../utils/website-fetcher'
import { marked } from 'marked'

let current_preview_url: string | undefined

export const get_current_preview_url = () => current_preview_url

export const handle_open_website = async (message: OpenWebsiteMessage) => {
  const file_path = get_website_file_path(message.url)

  if (fs.existsSync(file_path)) {
    const markdown = fs.readFileSync(file_path, 'utf8')
    const html = await marked.parse(markdown)

    const url_obj = new URL(message.url)
    let hostname = url_obj.hostname
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4)
    }
    const title = `${hostname}${url_obj.pathname == '/' ? '' : url_obj.pathname}`

    const panel = vscode.window.createWebviewPanel(
      'websitePreview',
      title,
      vscode.ViewColumn.One,
      { enableScripts: true }
    )

    panel.iconPath = new vscode.ThemeIcon('globe') as any

    current_preview_url = message.url
    vscode.commands.executeCommand(
      'setContext',
      'codeWebChat.websitePreviewActive',
      true
    )

    panel.onDidChangeViewState((e) => {
      if (e.webviewPanel.active) {
        current_preview_url = message.url
        vscode.commands.executeCommand(
          'setContext',
          'codeWebChat.websitePreviewActive',
          true
        )
      } else {
        vscode.commands.executeCommand(
          'setContext',
          'codeWebChat.websitePreviewActive',
          false
        )
      }
    })

    panel.onDidDispose(() => {
      if (current_preview_url === message.url) {
        current_preview_url = undefined
        vscode.commands.executeCommand(
          'setContext',
          'codeWebChat.websitePreviewActive',
          false
        )
      }
    })

    const csp = panel.webview.cspSource

    panel.webview.html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${csp} 'unsafe-inline' https://cdnjs.cloudflare.com; script-src 'unsafe-inline' https://cdnjs.cloudflare.com; font-src https://cdnjs.cloudflare.com;">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/vs2015.min.css">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>
        <script>document.addEventListener('DOMContentLoaded', () => hljs.highlightAll());</script>
        <title>${message.url}</title>
        <style>
          body {
            line-height: 1.5;
            padding: 20px 40px;
          }
          pre code.hljs {
            border-radius: 6px;
            padding: 10px 12px;
            border: 1px solid color-mix(in srgb, var(--vscode-foreground) 25%, transparent);
          }
          pre {
            margin: 16px 0;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `
  } else {
    vscode.env.openExternal(vscode.Uri.parse(message.url))
  }
}
