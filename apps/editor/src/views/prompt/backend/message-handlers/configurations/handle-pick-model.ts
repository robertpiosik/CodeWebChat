import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { PickModelMessage } from '@/views/prompt/types/messages'
import { pick_model } from '@/views/shared/actions/web/pick-model'

export const handle_pick_model = async (
  prompt_view_provider: PromptViewProvider,
  message: PickModelMessage
): Promise<void> => {
  const result = await pick_model({
    chatbot_name: message.chatbot_name,
    current_model_id: message.current_model_id
  })
  if (result) {
    prompt_view_provider.send_message({
      command: 'NEWLY_PICKED_MODEL',
      model_id: result.model_id
    })
  }
}
