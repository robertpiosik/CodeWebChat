import * as vscode from 'vscode'
import { UpdateEditFilesSystemInstructionsMessage } from '../../types/messages'

export const handle_update_edit_files_system_instructions = async (
  message: UpdateEditFilesSystemInstructionsMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const default_instructions =
    config.inspect<string>('editFilesSystemInstructions')?.defaultValue || ''
  await config.update(
    'editFilesSystemInstructions',
    message.instructions == '' || message.instructions == default_instructions
      ? undefined
      : message.instructions,
    vscode.ConfigurationTarget.Global
  )
}
