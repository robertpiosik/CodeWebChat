import { PanelProvider } from '@/views/panel/backend/panel-provider'
import * as vscode from 'vscode'
import { EditFormat } from '@shared/types/edit-format'
import {
  EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
  EDIT_FORMAT_INSTRUCTIONS_DIFF,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_WHOLE
} from '@/constants/edit-format-instructions'

export const handle_get_edit_format_instructions = (
  panel_provider: PanelProvider
) => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const instructions: Record<EditFormat, string> = {
    whole:
      config.get('editFormatInstructionsWhole') ||
      EDIT_FORMAT_INSTRUCTIONS_WHOLE,
    truncated:
      config.get('editFormatInstructionsTruncated') ||
      EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
    'search-replace':
      config.get('editFormatInstructionsSearchReplace') ||
      EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
    diff:
      config.get('editFormatInstructionsDiff') || EDIT_FORMAT_INSTRUCTIONS_DIFF
  }
  panel_provider.send_message({
    command: 'EDIT_FORMAT_INSTRUCTIONS',
    instructions
  })
}
