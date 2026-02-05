import * as vscode from 'vscode'
import { OpenKeybindingsMessage } from '@/views/settings/types/messages'

export const handle_open_keybindings = async (
  message: OpenKeybindingsMessage
): Promise<void> => {
  await vscode.commands.executeCommand(
    'workbench.action.openGlobalKeybindings',
    message.search
  )
}
