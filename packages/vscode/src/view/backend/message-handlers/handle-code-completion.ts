import * as vscode from 'vscode'
import { ViewProvider } from '@/view/backend/view-provider'
import { CodeCompletionMessage } from '@/view/types/messages'

export const handle_code_completion = async (
  provider: ViewProvider,
  message: CodeCompletionMessage
): Promise<void> => {
  vscode.commands.executeCommand(
    message.use_quick_pick
      ? 'codeWebChat.codeCompletionUsingAutoAccept'
      : 'codeWebChat.codeCompletionAutoAccept',
    { suggestions: provider.code_completion_suggestions }
  )
}
