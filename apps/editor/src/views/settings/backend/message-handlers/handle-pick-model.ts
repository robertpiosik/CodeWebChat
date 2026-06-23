import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { PickModelMessage } from '@/views/settings/types/messages'
import { pick_model } from '@/views/actions/pick-model'

export const handle_pick_model = async (
  settings_provider: SettingsProvider,
  message: PickModelMessage
): Promise<void> => {
  const selected = await pick_model({
    chatbot_name: message.chatbot_name,
    current_model_id: message.current_model_id
  })
  if (selected) {
    settings_provider.postMessage({
      command: 'NEWLY_PICKED_MODEL',
      model_id: selected
    })
  }
}
