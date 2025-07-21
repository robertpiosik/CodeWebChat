import * as vscode from 'vscode'
import { ViewProvider } from '@/view/backend/view-provider'
import { EditContextMessage } from '@/view/types/messages'

export const handle_edit_context = async (
  provider: ViewProvider,
  message: EditContextMessage
): Promise<void> => {
  vscode.commands.executeCommand(
    message.use_quick_pick
      ? 'codeWebChat.editContextUsing'
      : 'codeWebChat.editContext',
    {
      instructions: provider.edit_instructions,
      config_index: message.config_index
    }
  )
}
