import * as vscode from 'vscode'
import { UpdatePromptTemplatesMessage } from '@/views/settings/types/messages'

export const handle_update_prompt_templates = async (
  message: UpdatePromptTemplatesMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      message.templates_key,
      message.templates,
      vscode.ConfigurationTarget.Global
    )
}
