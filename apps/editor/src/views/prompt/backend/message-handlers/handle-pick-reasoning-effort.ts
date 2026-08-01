import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { PickReasoningEffortMessage } from '@/views/prompt/types/messages'
import { pick_reasoning_effort } from '@/views/shared/actions/api/pick-reasoning-effort'

export const handle_pick_reasoning_effort = async (
  prompt_view_provider: PromptViewProvider,
  message: PickReasoningEffortMessage
): Promise<void> => {
  const result = await pick_reasoning_effort({
    supported_efforts: message.supported_efforts,
    current_effort: message.current_effort
  })
  if (result) {
    prompt_view_provider.send_message({
      command: 'NEWLY_PICKED_REASONING_EFFORT',
      effort: result.effort
    })
  }
}
