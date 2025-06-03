import * as vscode from 'vscode'
import { ViewProvider } from '@/view/backend/view-provider'
import { RefactorMessage } from '@/view/types/messages'

export const handle_refactor = async (
  provider: ViewProvider,
  message: RefactorMessage
): Promise<void> => {
  vscode.commands.executeCommand(
    message.use_quick_pick
      ? 'codeWebChat.refactorUsing'
      : 'codeWebChat.refactor',
    { instructions: provider.instructions }
  )
}
