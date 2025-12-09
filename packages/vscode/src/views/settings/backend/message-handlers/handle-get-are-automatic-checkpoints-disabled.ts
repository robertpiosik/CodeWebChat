import { SettingsProvider } from '../settings-provider'
import { ARE_AUTOMATIC_CHECKPOINTS_DISABLED_STATE_KEY } from '@/constants/state-keys'

export async function handle_get_are_automatic_checkpoints_disabled(
  settings_provider: SettingsProvider
) {
  const disabled =
    settings_provider.context.workspaceState.get<boolean>(
      ARE_AUTOMATIC_CHECKPOINTS_DISABLED_STATE_KEY
    ) ?? false

  settings_provider.postMessage({
    command: 'ARE_AUTOMATIC_CHECKPOINTS_DISABLED',
    disabled
  })
}
