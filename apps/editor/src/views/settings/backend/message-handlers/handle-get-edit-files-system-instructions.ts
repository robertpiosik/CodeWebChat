import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'
import { default_system_instructions } from '@shared/constants/default-system-instructions'

export const handle_get_edit_files_system_instructions = async (
  provider: SettingsViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const instructions =
    config.get<string>('editFilesSystemInstructions') ||
    default_system_instructions
  provider.postMessage({
    command: 'EDIT_FILES_SYSTEM_INSTRUCTIONS',
    instructions
  })
}
