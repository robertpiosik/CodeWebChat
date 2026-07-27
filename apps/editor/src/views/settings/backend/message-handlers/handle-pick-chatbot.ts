import { pick_chatbot } from '@/views/shared/actions/web/pick-chatbot'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'
import { PickChatbotMessage } from '@/views/settings/types/messages'

export const handle_pick_chatbot = async (
  settings_provider: SettingsViewProvider,
  message: PickChatbotMessage
): Promise<void> => {
  const selected = await pick_chatbot({
    current_chatbot_id: message.chatbot_id
  })
  if (selected) {
    settings_provider.postMessage({
      command: 'NEWLY_PICKED_CHATBOT',
      chatbot_id: selected
    })
  }
}
