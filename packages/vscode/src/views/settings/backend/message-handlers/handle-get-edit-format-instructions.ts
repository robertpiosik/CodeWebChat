import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  EDIT_FORMAT_INSTRUCTIONS_BEFORE_AFTER,
  EDIT_FORMAT_INSTRUCTIONS_DIFF,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_WHOLE
} from '@/constants/edit-format-instructions'

export const handle_get_edit_format_instructions = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const instructions = {
    whole:
      config.get('editFormatInstructionsWhole', '') ||
      EDIT_FORMAT_INSTRUCTIONS_WHOLE,
    truncated:
      config.get('editFormatInstructionsTruncated', '') ||
      EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
    diff:
      config.get('editFormatInstructionsDiff', '') ||
      EDIT_FORMAT_INSTRUCTIONS_DIFF,
    before_after:
      config.get('editFormatInstructionsBeforeAfter', '') ||
      EDIT_FORMAT_INSTRUCTIONS_BEFORE_AFTER
  }
  provider.postMessage({
    command: 'EDIT_FORMAT_INSTRUCTIONS',
    instructions
  })
}
