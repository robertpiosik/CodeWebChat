import * as vscode from 'vscode'
import { MainViewProvider } from '@/views/main/backend/view-provider'
import { EditContextMessage } from '@/views/main/types/messages'

export const handle_edit_context = async (
  provider: MainViewProvider,
  message: EditContextMessage
): Promise<void> => {
  vscode.commands.executeCommand(
    message.use_quick_pick
      ? 'codeWebChat.editContextUsing'
      : 'codeWebChat.editContext',
    { instructions: provider.instructions }
  )
}
