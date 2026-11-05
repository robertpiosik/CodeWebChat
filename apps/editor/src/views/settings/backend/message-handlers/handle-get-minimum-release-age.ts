import * as vscode from 'vscode'
import { SettingsViewProvider } from '../settings-view-provider'

export const handle_get_minimum_release_age = async (
  provider: SettingsViewProvider
) => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const value = config.get<number>('minimumReleaseAge', 0)
  provider.postMessage({
    command: 'MINIMUM_RELEASE_AGE',
    value
  })
}
