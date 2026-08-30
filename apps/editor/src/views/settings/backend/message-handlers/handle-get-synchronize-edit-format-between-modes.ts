import * as vscode from 'vscode'
import { SettingsViewProvider } from '../settings-view-provider'

export const handle_get_synchronize_edit_format_between_targets = async (
  provider: SettingsViewProvider
) => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const enabled = config.get<boolean>(
    'synchronizeEditFormatBetweenTargets',
    true
  )

  provider.postMessage({
    command: 'SYNCHRONIZE_EDIT_FORMAT_BETWEEN_TARGETS',
    enabled
  })
}
