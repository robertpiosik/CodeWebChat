import * as vscode from 'vscode'
import { SettingsViewProvider } from '../settings-view-provider'

export const handle_get_update_check_frequency = async (
  provider: SettingsViewProvider
) => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const value = config.get<'hourly' | 'daily' | 'weekly' | 'monthly'>(
    'updateCheckFrequency',
    'hourly'
  )
  provider.postMessage({
    command: 'UPDATE_CHECK_FREQUENCY',
    value
  })
}
