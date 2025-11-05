import { PanelProvider } from '@/views/panel/backend/panel-provider'
import * as vscode from 'vscode'
import { EditFormat } from '@shared/types/edit-format'

export const handle_get_edit_format_instructions = (
  panel_provider: PanelProvider
): void => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const instructions = config.get<Record<EditFormat, string>>(
    'editFormatInstructions'
  )
  panel_provider.send_message({
    command: 'EDIT_FORMAT_INSTRUCTIONS',
    instructions: instructions!
  })
}
