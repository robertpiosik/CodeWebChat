import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { find_relevant_files_instructions_prefix } from '@/constants/instructions'

export const handle_get_find_relevant_files_instructions_prefix = (
  panel_provider: PanelProvider
) => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const prefix =
    config.get<string>('findRelevantFilesInstructionsPrefix') ||
    find_relevant_files_instructions_prefix

  panel_provider.send_message({
    command: 'FIND_RELEVANT_FILES_INSTRUCTIONS_PREFIX',
    prefix
  })
}
