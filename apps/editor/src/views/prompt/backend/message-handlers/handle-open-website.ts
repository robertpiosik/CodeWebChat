import * as vscode from 'vscode'
import { OpenWebsiteMessage } from '../../types/messages'
import * as fs from 'fs'
import { marked } from 'marked'
import { JSDOM } from 'jsdom'
import createDOMPurify from 'dompurify'
import { PromptViewProvider } from '../prompt-view-provider'
import { PersistentTextStorage } from '../utils/persistent-text-storage'

let current_preview_url: string | undefined

export const get_current_preview_url = () => current_preview_url

export const handle_open_website = async (
  prompt_view_provider: PromptViewProvider,
  message: OpenWebsiteMessage
) => {
  let id: string | undefined
  let title = 'Website'

  const escaped_url = message.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const instructions = prompt_view_provider.current_instructions
  const symbol_regex = new RegExp(
    `#Website\\(${escaped_url} ([a-fA-F0-9]+):\\d+(?: "((?:\\\\.|[^"\\\\])*)")?\\)`
  )

  let match = instructions.match(symbol_regex)
  if (!match) {
    for (const task of prompt_view_provider.completed_tasks) {
      match = task.match(symbol_regex)
      if (match) break
    }
  }

  if (match) {
    id = match[1]
    if (match[2]) {
      title = match[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    }
  }

  const storage = new PersistentTextStorage(
    prompt_view_provider.extension_context
  )
  const file_path = id ? storage.get_file_path(id) : ''

  if (id && fs.existsSync(file_path)) {
    const markdown = fs.readFileSync(file_path, 'utf8')
    const raw_html = await marked.parse(markdown)
    const window = new JSDOM('').window
    const DOMPurify = createDOMPurify(window as any)
    const html = DOMPurify.sanitize(raw_html)

    const webview_panel = vscode.window.createWebviewPanel(
      'websitePreview',
      title,
      vscode.ViewColumn.One,
      {}
    )

    webview_panel.iconPath = new vscode.ThemeIcon('globe') as any

    current_preview_url = message.url
    vscode.commands.executeCommand(
      'setContext',
      'codeWebChat.websitePreviewActive',
      true
    )

    webview_panel.onDidChangeViewState((e) => {
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

    webview_panel.onDidDispose(() => {
      if (current_preview_url === message.url) {
        current_preview_url = undefined
        vscode.commands.executeCommand(
          'setContext',
          'codeWebChat.websitePreviewActive',
          false
        )
      }
    })

    const csp = webview_panel.webview.cspSource

    const escaped_title = title
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')

    webview_panel.webview.html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${csp} 'unsafe-inline';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escaped_title}</title>
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
    if (message.url.startsWith('http')) {
      vscode.env.openExternal(vscode.Uri.parse(message.url))
    } else {
      vscode.window.showErrorMessage('Website file not found.')
    }
  }
}
