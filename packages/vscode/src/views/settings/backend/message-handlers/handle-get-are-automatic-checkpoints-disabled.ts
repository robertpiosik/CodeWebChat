import { SettingsProvider } from '../settings-provider'
import * as vscode from 'vscode'

export async function handle_get_are_automatic_checkpoints_disabled(
  settings_provider: SettingsProvider
) {
  const disabled = vscode.workspace
    .getConfiguration('codeWebChat')
    .get<boolean>('areAutomaticCheckpointsDisabled', false)

  settings_provider.postMessage({
    command: 'ARE_AUTOMATIC_CHECKPOINTS_DISABLED',
    disabled
  })
}
