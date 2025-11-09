import * as vscode from 'vscode'
import { UpdateEditFormatInstructionsMessage } from '@/views/settings/types/messages'

export const handle_update_edit_format_instructions = async (
  message: UpdateEditFormatInstructionsMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  await config.update(
    'editFormatInstructions',
    message.instructions,
    vscode.ConfigurationTarget.Global
  )
}
