import * as vscode from 'vscode'
import { UpdateEditFormatInstructionsMessage } from '@/views/settings/types/messages'

export const handle_update_edit_format_instructions = async (
  message: UpdateEditFormatInstructionsMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  await Promise.all([
    config.update(
      'editFormatInstructionsWhole',
      message.instructions.whole,
      vscode.ConfigurationTarget.Global
    ),
    config.update(
      'editFormatInstructionsTruncated',
      message.instructions.truncated,
      vscode.ConfigurationTarget.Global
    ),
    config.update(
      'editFormatInstructionsDiff',
      message.instructions.diff,
      vscode.ConfigurationTarget.Global
    )
  ])
}
