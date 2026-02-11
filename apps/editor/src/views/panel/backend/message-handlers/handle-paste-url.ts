import * as vscode from 'vscode'
import axios from 'axios'
import { PasteUrlMessage } from '../../types/messages'
import { PanelProvider } from '../panel-provider'
import * as fs from 'fs'
import {
  fetch_and_save_website,
  get_website_file_path
} from '../utils/website-fetcher'

export const handle_paste_url = async (
  panel_provider: PanelProvider,
  message: PasteUrlMessage
) => {
  const paste_as_text = async () => {
    const selection = await vscode.window.showInformationMessage(
      'Failed to parse the website. Place URL instead?',
      { modal: true },
      'Yes'
    )
    if (selection == 'Yes') {
      panel_provider.add_text_at_cursor_position(message.url)
    }
  }

  try {
    const url = message.url
    const file_path = get_website_file_path(url)

    if (fs.existsSync(file_path)) {
      panel_provider.add_text_at_cursor_position(`#Website(${url})`)
      return
    }

    const cancel_token_source = axios.CancelToken.source()
    panel_provider.api_call_cancel_token_source = cancel_token_source

    panel_provider.send_message({
      command: 'SHOW_PROGRESS',
      title: 'Fetching website...',
      show_elapsed_time: true,
      cancellable: true
    })

    let content: string | null = null
    try {
      content = await fetch_and_save_website(url, cancel_token_source.token)
    } finally {
      panel_provider.send_message({ command: 'HIDE_PROGRESS' })
      panel_provider.api_call_cancel_token_source = null
    }

    if (content) {
      panel_provider.add_text_at_cursor_position(`#Website(${url})`)
    } else {
      await paste_as_text()
    }
  } catch (error) {
    await paste_as_text()
  }
}
