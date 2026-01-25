import * as vscode from 'vscode'
import { UpdateAiStudioUserIdMessage } from '@/views/settings/types/messages'

export const handle_update_ai_studio_user_id = async (
  message: UpdateAiStudioUserIdMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'aiStudioUserId',
      message.aiStudioUserId || undefined,
      vscode.ConfigurationTarget.Global
    )
}
