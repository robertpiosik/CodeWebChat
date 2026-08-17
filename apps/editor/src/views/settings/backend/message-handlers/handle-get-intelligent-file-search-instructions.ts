import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'
import { intelligent_file_search_instructions } from '@/constants/instructions'

export const handle_get_intelligent_file_search_instructions = async (
  provider: SettingsViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const instructions =
    config.get<string>('intelligentFileSearchInstructions') ||
    intelligent_file_search_instructions
  provider.postMessage({
    command: 'INTELLIGENT_FILE_SEARCH_INSTRUCTIONS',
    instructions
  })
}
