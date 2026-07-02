import * as vscode from 'vscode'
import { default_system_instructions } from '@shared/constants/default-system-instructions'
import { UpdateEditFilesSystemInstructionsMessage } from '../../types/messages'

export const handle_update_edit_files_system_instructions = async (
  message: UpdateEditFilesSystemInstructionsMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'editFilesSystemInstructions',
      message.instructions == '' ||
        message.instructions == default_system_instructions
        ? undefined
        : message.instructions,
      vscode.ConfigurationTarget.Global
    )
}
