import * as vscode from 'vscode'
import { OpenWebsiteMessage } from '../../types/messages'
import * as fs from 'fs'
import { get_website_file_path } from '../utils/website-fetcher'
import { marked } from 'marked'

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

    panel.webview.html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Website Preview</title>
        <style>
          body {
            line-height: 1.5;
            padding: 20px 40px;
          }
          hr {
            height: 1px;
            border: none;
            background-color: var(--vscode-editorWidget-border);
          }
        </style>
      </head>
      <body>
        <a href="${message.url}">${message.url}</a>
        <hr>
        ${html}
      </body>
      </html>
    `
  } else {
    vscode.env.openExternal(vscode.Uri.parse(message.url))
  }
}
