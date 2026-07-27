import { pick_chatbot } from '@/views/shared/actions/web/pick-chatbot'
import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'
import { PickChatbotMessage } from '@/views/panel/types/messages'

export const handle_pick_chatbot = async (
  panel_view_provider: PanelViewProvider,
  message: PickChatbotMessage
): Promise<void> => {
  const selected = await pick_chatbot({
    current_chatbot_id: message.chatbot_id
  })
  if (selected) {
    panel_view_provider.send_message({
      command: 'NEWLY_PICKED_CHATBOT',
      chatbot_id: selected
    })
  }
}
