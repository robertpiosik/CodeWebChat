import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { find_relevant_files_instructions_prefix } from '@/constants/instructions'

export const handle_get_find_relevant_files_instructions_prefix = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const instructions =
    config.get<string>('findRelevantFilesInstructionsPrefix') ||
    find_relevant_files_instructions_prefix
  provider.postMessage({
    command: 'FIND_RELEVANT_FILES_INSTRUCTIONS_PREFIX',
    instructions
  })
}
