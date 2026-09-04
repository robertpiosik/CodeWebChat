import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'
import { ai_file_search_task_instructions } from '@/constants/instructions'

export const handle_get_agentic_file_search_instructions = async (
  provider: SettingsViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const instructions =
    config.get<string>('agenticFileSearchInstructions') ||
    ai_file_search_task_instructions
  provider.postMessage({
    command: 'AGENTIC_FILE_SEARCH_INSTRUCTIONS',
    instructions
  })
}
