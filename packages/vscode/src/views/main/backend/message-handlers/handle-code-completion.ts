import * as vscode from 'vscode'
import { MainViewProvider } from '@/views/main/backend/view-provider'
import { CodeCompletionMessage } from '@/views/main/types/messages'

export const handle_code_completion = async (
  provider: MainViewProvider,
  message: CodeCompletionMessage
): Promise<void> => {
  vscode.commands.executeCommand(
    message.use_quick_pick
      ? 'codeWebChat.codeCompletionUsingAutoAccept'
      : 'codeWebChat.codeCompletionAutoAccept',
    { suggestions: provider.code_completion_suggestions }
  )
}
