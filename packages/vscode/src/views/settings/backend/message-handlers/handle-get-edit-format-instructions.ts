import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'

export const handle_get_edit_format_instructions = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const instructions = config.get('editFormatInstructions') as {
    whole: string
    truncated: string
    diff: string
  }
  provider.postMessage({
    command: 'EDIT_FORMAT_INSTRUCTIONS',
    instructions
  })
}
