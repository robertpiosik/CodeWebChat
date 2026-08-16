import * as vscode from 'vscode'
import { UpdateTemplatesMessage } from '@/views/settings/types/messages'

export const handle_update_templates = async (
  message: UpdateTemplatesMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      message.templates_key,
      message.templates,
      vscode.ConfigurationTarget.Global
    )
}
