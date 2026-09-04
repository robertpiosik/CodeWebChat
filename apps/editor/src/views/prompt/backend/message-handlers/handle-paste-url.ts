import * as vscode from 'vscode'
import { PasteUrlMessage } from '../../types/messages'
import { PromptViewProvider } from '../prompt-view-provider'
import * as fs from 'fs'
import {
  fetch_and_save_website,
  get_website_file_path
} from '../utils/website-fetcher'

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
    if (selection == 'Yes') {
      prompt_view_provider.add_text_at_cursor_position(message.url)
    }
  }

  try {
    const url = message.url
    const file_path = get_website_file_path(url)

    if (fs.existsSync(file_path)) {
      prompt_view_provider.add_text_at_cursor_position(`#Website(${url})`)
      return
    }

    const abort_controller = new AbortController()
    prompt_view_provider.api_call_abort_controller = abort_controller

    prompt_view_provider.send_message({
      command: 'SHOW_PROGRESS',
      title: 'Fetching website...',
      cancellable: true
    })

    let content: string | null = null
    try {
      content = await fetch_and_save_website(url, abort_controller.signal)
    } finally {
      prompt_view_provider.send_message({ command: 'HIDE_PROGRESS' })
      prompt_view_provider.api_call_abort_controller = null
    }

    if (content) {
      prompt_view_provider.add_text_at_cursor_position(`#Website(${url})`)
    } else {
      await paste_as_text()
    }
  } catch (error) {
    await paste_as_text()
  }
}
