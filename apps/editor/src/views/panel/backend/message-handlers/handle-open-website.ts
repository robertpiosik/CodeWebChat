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

    const panel = vscode.window.createWebviewPanel(
      'websitePreview',
      'Website Preview',
      vscode.ViewColumn.One
    )

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

    panel.webview.html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${message.url}</title>
        <style>
          body {
            line-height: 1.5;
            padding: 20px 40px;
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
