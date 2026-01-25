import * as vscode from 'vscode'
import { UpdateEditContextSystemInstructionsMessage } from '@/views/settings/types/messages'

export const handle_update_edit_context_system_instructions = async (
  message: UpdateEditContextSystemInstructionsMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'editContextSystemInstructions',
      message.instructions,
      vscode.ConfigurationTarget.Global
    )
}
