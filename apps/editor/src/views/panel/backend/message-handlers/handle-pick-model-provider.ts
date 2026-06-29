import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { PickModelProviderMessage } from '@/views/panel/types/messages'
import {
  edit_model_provider_for_api_configuration,
  edit_model_for_api_configuration
} from '@/views/shared/actions/api/update/interactions'
import { ModelProvidersManager } from '@/services/model-providers-manager'
import { ModelFetcher } from '@/services/model-fetcher'

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
    const model_fetcher = new ModelFetcher()
    const temp_api_configuration = {
      id: '',
      model_provider_name: result.model_provider_name,
      model: ''
    }

    const new_model = await edit_model_for_api_configuration({
      api_configuration: temp_api_configuration,
      providers_manager,
      model_fetcher,
      tool_type: message.tool_type
    })

    if (new_model !== undefined) {
      panel_provider.send_message({
        command: 'NEWLY_PICKED_MODEL_PROVIDER',
        model_provider_name: result.model_provider_name
      })
      panel_provider.send_message({
        command: 'NEWLY_PICKED_API_MODEL',
        model_id: new_model
      })
    }
  }
}
