import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { PickModelProviderMessage } from '@/views/panel/types/messages'
import { edit_model_provider_for_api_configuration } from '@/views/actions/update-api-configuration/interactions'
import { ModelProvidersManager } from '@/services/model-providers-manager'

export const handle_pick_model_provider = async (
  panel_provider: PanelProvider,
  message: PickModelProviderMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(panel_provider.context)
  const result = await edit_model_provider_for_api_configuration(
    providers_manager,
    message.current_model_provider_name
  )
  if (result) {
    panel_provider.send_message({
      command: 'NEWLY_PICKED_MODEL_PROVIDER',
      model_provider_name: result.model_provider_name
    })
  }
}
