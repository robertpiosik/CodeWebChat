import { SettingsViewProvider } from '../settings-view-provider'
import { PickExampleFlagsMessage } from '../../types/messages'
import { pick_example_flags } from '@/views/shared/actions/agent/pick-example-flags'

export const handle_pick_example_flags = async (
  settings_provider: SettingsViewProvider,
  message: PickExampleFlagsMessage
): Promise<void> => {
  const result = await pick_example_flags({ agent: message.agent })
  if (result) {
    settings_provider.postMessage({
      command: 'NEWLY_PICKED_EXAMPLE_FLAG',
      flag: result
    })
  }
}
