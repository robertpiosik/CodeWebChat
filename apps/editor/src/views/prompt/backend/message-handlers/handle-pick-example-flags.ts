import { PromptViewProvider } from '../prompt-view-provider'
import { PickExampleFlagsMessage } from '../../types/messages'
import { pick_example_flags } from '@/views/shared/actions/agent/pick-example-flags'

export const handle_pick_example_flags = async (
  prompt_view_provider: PromptViewProvider,
  message: PickExampleFlagsMessage
): Promise<void> => {
  const result = await pick_example_flags({ agent: message.agent })
  if (result) {
    prompt_view_provider.send_message({
      command: 'NEWLY_PICKED_EXAMPLE_FLAG',
      flag: result
    })
  }
}
