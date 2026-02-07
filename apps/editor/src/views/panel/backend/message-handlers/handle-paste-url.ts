import * as vscode from 'vscode'
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

    const content = await fetch_and_save_website(url)

    if (content) {
      panel_provider.add_text_at_cursor_position(`#Website(${url})`)
    } else {
      await paste_as_text()
    }
  } catch (error) {
    await paste_as_text()
  }
}
