import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { find_relevant_files_instructions } from '@/constants/instructions'

export const handle_get_find_relevant_files_instructions = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const instructions =
    config.get<string>('findRelevantFilesInstructions') ||
    find_relevant_files_instructions
  provider.postMessage({
    command: 'FIND_RELEVANT_FILES_INSTRUCTIONS',
    instructions
  })
}
