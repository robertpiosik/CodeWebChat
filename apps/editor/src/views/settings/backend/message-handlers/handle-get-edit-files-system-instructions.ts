import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'

export const handle_get_edit_files_system_instructions = async (
  provider: SettingsViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const default_instructions =
    config.inspect<string>('editFilesSystemInstructions')?.defaultValue || ''
  const instructions =
    config.get<string>('editFilesSystemInstructions') || default_instructions
  provider.postMessage({
    command: 'EDIT_FILES_SYSTEM_INSTRUCTIONS',
    instructions,
    default_instructions
  })
}
