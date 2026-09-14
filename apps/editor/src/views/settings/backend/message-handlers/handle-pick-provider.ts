import { SettingsViewProvider } from '../settings-view-provider'
import { ProvidersManager } from '@/services/providers-manager'
import { ModelFetcher } from '@/services/model-fetcher'
import {
  edit_model_for_api_configuration,
  edit_provider_for_api_configuration
} from '@/views/shared/actions/api/update/interactions'

export const handle_pick_provider = async (
  provider: SettingsViewProvider,
  message: any
): Promise<void> => {
  const providers_manager = new ProvidersManager(provider.extension_context)
  const result = await edit_provider_for_api_configuration(
    providers_manager,
    message.current_provider_name
  )
  if (result) {
    const model_fetcher = new ModelFetcher()
    const temp_api_configuration = {
      id: '',
      provider_name: result.provider_name,
      model: ''
    }

    const new_model = await edit_model_for_api_configuration({
      api_configuration: temp_api_configuration as any,
      providers_manager,
      model_fetcher
    })

    if (new_model !== undefined) {
      provider.postMessage({
        command: 'NEWLY_PICKED_PROVIDER',
        provider_name: result.provider_name
      })
      provider.postMessage({
        command: 'NEWLY_PICKED_API_MODEL',
        model_id: new_model
      })
    }
  }
}
