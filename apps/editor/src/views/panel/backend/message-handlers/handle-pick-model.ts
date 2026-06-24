import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { PickModelMessage } from '@/views/panel/types/messages'
import { pick_model } from '@/views/actions/pick-model'

export const handle_pick_model = async (
  panel_provider: PanelProvider,
  message: PickModelMessage
): Promise<void> => {
  const result = await pick_model({
    chatbot_name: message.chatbot_name,
    current_model_id: message.current_model_id
  })
  if (result) {
    panel_provider.send_message({
      command: 'NEWLY_PICKED_MODEL',
      model_id: result.model_id
    })
  }
}
