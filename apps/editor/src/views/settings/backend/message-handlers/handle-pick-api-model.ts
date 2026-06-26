import { SettingsProvider } from '../settings-provider'
import { ModelProvidersManager } from '@/services/model-providers-manager'
import { ModelFetcher } from '@/services/model-fetcher'
import { edit_model_for_api_configuration } from '@/views/actions/update-api-configuration/interactions'

export const handle_pick_api_model = async (
  provider: SettingsProvider,
  message: any
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const model_fetcher = new ModelFetcher()

  const model = await edit_model_for_api_configuration({
    api_configuration: {
      model_provider_name: message.model_provider_name,
      model: message.current_model
    } as any,
    providers_manager,
    model_fetcher,
    tool_type: message.tool_type
  })

  if (model) {
    provider.postMessage({
      command: 'NEWLY_PICKED_API_MODEL',
      model_id: model
    })
  }
}
