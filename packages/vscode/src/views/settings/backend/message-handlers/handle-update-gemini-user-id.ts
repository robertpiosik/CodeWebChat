import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { UpdateGeminiUserIdMessage } from '@/views/settings/types/messages'

export const handle_update_gemini_user_id = async (
  provider: SettingsProvider,
  message: UpdateGeminiUserIdMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'geminiUserId',
      message.geminiUserId,
      vscode.ConfigurationTarget.Global
    )
}
