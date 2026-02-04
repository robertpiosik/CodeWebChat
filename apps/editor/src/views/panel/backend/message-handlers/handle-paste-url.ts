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
      panel_provider.add_text_at_cursor_position(url)
    }
  } catch (error) {
    panel_provider.add_text_at_cursor_position(message.url)
  }
}
