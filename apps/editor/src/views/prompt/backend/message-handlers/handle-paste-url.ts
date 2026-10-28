import * as vscode from 'vscode'
import { PasteUrlMessage } from '../../types/messages'
import { PromptViewProvider } from '../prompt-view-provider'
import { fetch_website } from '../utils/website-fetcher'
import { PersistentTextStorage } from '../utils/persistent-text-storage'

export const handle_paste_url = async (
  prompt_view_provider: PromptViewProvider,
  message: PasteUrlMessage
) => {
  const paste_as_text = async () => {
    const selection = await vscode.window.showInformationMessage(
      'Failed to parse the website. Place URL instead?',
      { modal: true },
      'Yes'
    )
    if (selection === 'Yes') {
      prompt_view_provider.add_text_at_cursor_position(message.url)
    }
  }

  try {
    const storage = new PersistentTextStorage(
      prompt_view_provider.extension_context
    )

    const abort_controller = new AbortController()
    prompt_view_provider.api_call_abort_controller = abort_controller

    prompt_view_provider.send_message({
      command: 'SHOW_PROGRESS',
      title: 'Fetching website...',
      cancellable: true
    })

    let content: string | null = null
    let title: string = ''
    let id: string | null = null
    try {
      const result = await fetch_website(message.url, abort_controller.signal)
      if (result) {
        content = result.content
        title = result.title
        id = await storage.save(content)
      }
    } finally {
      prompt_view_provider.send_message({ command: 'HIDE_PROGRESS' })
      prompt_view_provider.api_call_abort_controller = null
    }

    if (content && id) {
      const token_count = Math.ceil(content.length / 4)

      let title_part = ''
      if (title) {
        title_part = ` "${title.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
      } else {
        try {
          const parsed = new URL(message.url)
          let hostname = parsed.hostname
          if (hostname.startsWith('www.')) {
            hostname = hostname.slice(4)
          }
          title_part = ` "${hostname}"`
        } catch {}
      }

      prompt_view_provider.add_text_at_cursor_position(
        `#Website(${message.url} ${id}:${token_count}${title_part})`
      )
    } else {
      await paste_as_text()
    }
  } catch {
    await paste_as_text()
  }
}
