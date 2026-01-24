import * as vscode from 'vscode'
import { OpenExternalUrlMessage } from '../../types/messages'

export const handle_open_external_url = async (
  message: OpenExternalUrlMessage
) => {
  await vscode.env.openExternal(vscode.Uri.parse(message.url))
}
