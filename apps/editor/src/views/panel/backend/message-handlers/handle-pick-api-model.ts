import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'
import { PickApiModelMessage } from '@/views/panel/types/messages'
import { edit_model_for_api_configuration } from '@/views/shared/actions/api/update/interactions'
import { ModelProvidersManager } from '@/services/model-providers-manager'
import { ModelFetcher } from '@/services/model-fetcher'

export const handle_pick_api_model = async (
  panel_view_provider: PanelViewProvider,
  message: PickApiModelMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(
    panel_view_provider.extension_context
  )
  const model_fetcher = new ModelFetcher()

  const temp_api_configuration = {
    id: '',
    model_provider_name: message.model_provider_name,
    model: message.current_model || ''
  }

  const new_model = await edit_model_for_api_configuration({
    api_configuration: temp_api_configuration,
    providers_manager,
    model_fetcher
  })

  if (new_model !== undefined) {
    panel_view_provider.send_message({
      command: 'NEWLY_PICKED_API_MODEL',
      model_id: new_model
    })
  }
}
