import * as vscode from 'vscode'
import { SettingsViewProvider } from '../settings-view-provider'

export const handle_get_synchronize_edit_format_between_modes = async (
  provider: SettingsViewProvider
) => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const enabled = config.get<boolean>('synchronizeEditFormatBetweenModes', true)

  provider.postMessage({
    command: 'SYNCHRONIZE_EDIT_FORMAT_BETWEEN_MODES',
    enabled
  })
}
