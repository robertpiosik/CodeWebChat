import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { PickChatbotMessage } from '@/views/settings/types/messages'
import { pick_chatbot } from '@/views/actions/pick-chatbot'

export const handle_pick_chatbot = async (
  settings_provider: SettingsProvider,
  message: PickChatbotMessage
): Promise<void> => {
  const selected = await pick_chatbot({ current_chatbot_id: message.chatbot_id })
  if (selected) {
    settings_provider.postMessage({
      command: 'NEWLY_PICKED_CHATBOT',
      chatbot_id: selected
    })
  }
}
