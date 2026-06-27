import { pick_chatbot } from '@/views/actions/web/pick-chatbot'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { PickChatbotMessage } from '@/views/panel/types/messages'

export const handle_pick_chatbot = async (
  panel_provider: PanelProvider,
  message: PickChatbotMessage
): Promise<void> => {
  const selected = await pick_chatbot({
    current_chatbot_id: message.chatbot_id
  })
  if (selected) {
    panel_provider.send_message({
      command: 'NEWLY_PICKED_CHATBOT',
      chatbot_id: selected
    })
  }
}
