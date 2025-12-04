import * as vscode from 'vscode'
import { UpdateEditFormatInstructionsMessage } from '@/views/settings/types/messages'
import {
  EDIT_FORMAT_INSTRUCTIONS_DIFF,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_WHOLE
} from '@/constants/edit-format-instructions'

export const handle_update_edit_format_instructions = async (
  message: UpdateEditFormatInstructionsMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  await Promise.all([
    config.update(
      'editFormatInstructionsWhole',
      message.instructions.whole === EDIT_FORMAT_INSTRUCTIONS_WHOLE
        ? undefined
        : message.instructions.whole,
      vscode.ConfigurationTarget.Global
    ),
    config.update(
      'editFormatInstructionsTruncated',
      message.instructions.truncated === EDIT_FORMAT_INSTRUCTIONS_TRUNCATED
        ? undefined
        : message.instructions.truncated,
      vscode.ConfigurationTarget.Global
    ),
    config.update(
      'editFormatInstructionsDiff',
      message.instructions.diff === EDIT_FORMAT_INSTRUCTIONS_DIFF
        ? undefined
        : message.instructions.diff,
      vscode.ConfigurationTarget.Global
    )
  ])
}
