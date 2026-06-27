import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { PickModelMessage } from '@/views/settings/types/messages'
import { pick_model } from '@/views/actions/web/pick-model'

export const handle_pick_model = async (
  settings_provider: SettingsProvider,
  message: PickModelMessage
): Promise<void> => {
  const result = await pick_model({
    chatbot_name: message.chatbot_name,
    current_model_id: message.current_model_id
  })
  if (result) {
    settings_provider.postMessage({
      command: 'NEWLY_PICKED_MODEL',
      model_id: result.model_id
    })
  }
}
