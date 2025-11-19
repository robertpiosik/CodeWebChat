import * as vscode from 'vscode'
import { ManageConfigurationsMessage } from '@/views/panel/types/messages'

export const handle_manage_configurations = async (
  message: ManageConfigurationsMessage
): Promise<void> => {
  const section =
    message.api_prompt_type == 'edit-context'
      ? 'edit-context'
      : 'code-completions'
  await vscode.commands.executeCommand('codeWebChat.settings', section)
}
