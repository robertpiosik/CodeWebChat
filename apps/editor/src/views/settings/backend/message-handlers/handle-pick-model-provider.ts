import { SettingsProvider } from '../settings-provider'
import { ModelProvidersManager } from '@/services/model-providers-manager'
import { ModelFetcher } from '@/services/model-fetcher'
import {
  edit_model_for_api_configuration,
  edit_model_provider_for_api_configuration
} from '@/views/actions/api/update/interactions'

export const handle_pick_model_provider = async (
  provider: SettingsProvider,
  message: any
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
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
      api_configuration: temp_api_configuration as any,
      providers_manager,
      model_fetcher,
      tool_type: message.tool_type
    })

    if (new_model !== undefined) {
      provider.postMessage({
        command: 'NEWLY_PICKED_MODEL_PROVIDER',
        model_provider_name: result.model_provider_name
      })
      provider.postMessage({
        command: 'NEWLY_PICKED_API_MODEL',
        model_id: new_model
      })
    }
  }
}
