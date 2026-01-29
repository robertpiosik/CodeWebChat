import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { default_system_instructions } from '@shared/constants/default-system-instructions'

export const handle_get_edit_context_system_instructions = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const instructions =
    config.get<string>('editContextSystemInstructions') ||
    default_system_instructions
  provider.postMessage({
    command: 'EDIT_CONTEXT_SYSTEM_INSTRUCTIONS',
    instructions
  })
}
