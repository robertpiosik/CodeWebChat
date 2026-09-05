import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'
import { intelligent_search_task_instructions } from '@/constants/instructions'

export const handle_get_intelligent_search_instructions = async (
  provider: SettingsViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const instructions =
    config.get<string>('intelligentSearchInstructions') ||
    intelligent_search_task_instructions
  provider.postMessage({
    command: 'INTELLIGENT_SEARCH_INSTRUCTIONS',
    instructions
  })
}
