import * as vscode from 'vscode'
import { UpdateGeminiUserIdMessage } from '@/views/settings/types/messages'

export const handle_update_gemini_user_id = async (
  message: UpdateGeminiUserIdMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'geminiUserId',
      message.geminiUserId || undefined,
      vscode.ConfigurationTarget.Global
    )
}
