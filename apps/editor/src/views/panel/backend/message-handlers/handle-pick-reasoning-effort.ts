import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { PickReasoningEffortMessage } from '@/views/panel/types/messages'
import { pick_reasoning_effort } from '@/views/shared/actions/api/pick-reasoning-effort'

export const handle_pick_reasoning_effort = async (
  panel_provider: PanelProvider,
  message: PickReasoningEffortMessage
): Promise<void> => {
  const result = await pick_reasoning_effort({
    supported_efforts: message.supported_efforts,
    current_effort: message.current_effort
  })
  if (result) {
    panel_provider.send_message({
      command: 'NEWLY_PICKED_REASONING_EFFORT',
      effort: result.effort
    })
  }
}
