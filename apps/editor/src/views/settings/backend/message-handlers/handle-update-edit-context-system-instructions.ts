import * as vscode from 'vscode'
import { UpdateEditContextSystemInstructionsMessage } from '@/views/settings/types/messages'
import { default_system_instructions } from '@shared/constants/default-system-instructions'

export const handle_update_edit_context_system_instructions = async (
  message: UpdateEditContextSystemInstructionsMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'editContextSystemInstructions',
      message.instructions == '' ||
        message.instructions == default_system_instructions
        ? undefined
        : message.instructions,
      vscode.ConfigurationTarget.Global
    )
}
