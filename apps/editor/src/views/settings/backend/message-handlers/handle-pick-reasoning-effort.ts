import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { PickReasoningEffortMessage } from '@/views/settings/types/messages'
import { pick_reasoning_effort } from '@/views/shared/actions/api/pick-reasoning-effort'

export const handle_pick_reasoning_effort = async (
  settings_provider: SettingsProvider,
  message: PickReasoningEffortMessage
): Promise<void> => {
  const result = await pick_reasoning_effort({
    supported_efforts: message.supported_efforts,
    current_effort: message.current_effort
  })
  if (result) {
    settings_provider.postMessage({
      command: 'NEWLY_PICKED_REASONING_EFFORT',
      effort: result.effort
    })
  }
}
