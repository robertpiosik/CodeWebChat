import { pick_chatbot } from '@/views/shared/actions/web/pick-chatbot'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { PickChatbotMessage } from '@/views/prompt/types/messages'

export const handle_pick_chatbot = async (
  prompt_view_provider: PromptViewProvider,
  message: PickChatbotMessage
): Promise<void> => {
  const selected = await pick_chatbot({
    current_chatbot_id: message.chatbot_id
  })
  if (selected) {
    prompt_view_provider.send_message({
      command: 'NEWLY_PICKED_CHATBOT',
      chatbot_id: selected
    })
  }
}
