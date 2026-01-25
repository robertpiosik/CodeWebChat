import * as vscode from 'vscode'
import { ApplyResponseFromHistoryMessage } from '@/views/panel/types/messages'

export const handle_apply_response_from_history = async (
  message: ApplyResponseFromHistoryMessage
): Promise<void> => {
  await vscode.commands.executeCommand('codeWebChat.applyChatResponse', {
    response: message.response,
    raw_instructions: message.raw_instructions,
    files_with_content: message.files,
    created_at: message.created_at
  })
}
