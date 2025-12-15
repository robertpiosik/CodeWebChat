import { PanelProvider } from '@/views/panel/backend/panel-provider'
import * as vscode from 'vscode'
import { EditFormat } from '@shared/types/edit-format'
import {
  EDIT_FORMAT_INSTRUCTIONS_BEFORE_AFTER,
  EDIT_FORMAT_INSTRUCTIONS_DIFF,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_WHOLE
} from '@/constants/edit-format-instructions'

export const handle_get_edit_format_instructions = (
  panel_provider: PanelProvider
): void => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const instructions: Record<EditFormat, string> = {
    whole:
      config.get('editFormatInstructionsWhole') ||
      EDIT_FORMAT_INSTRUCTIONS_WHOLE,
    truncated:
      config.get('editFormatInstructionsTruncated') ||
      EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
    'before-after':
      config.get('editFormatInstructionsBeforeAfter') ||
      EDIT_FORMAT_INSTRUCTIONS_BEFORE_AFTER,
    diff:
      config.get('editFormatInstructionsDiff') || EDIT_FORMAT_INSTRUCTIONS_DIFF
  }
  panel_provider.send_message({
    command: 'EDIT_FORMAT_INSTRUCTIONS',
    instructions
  })
}
