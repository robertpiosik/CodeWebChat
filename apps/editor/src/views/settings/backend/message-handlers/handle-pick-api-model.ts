import { SettingsViewProvider } from '../settings-view-provider'
import { ProvidersManager } from '@/services/providers-manager'
import { ModelFetcher } from '@/services/model-fetcher'
import { edit_model_for_api_configuration } from '@/views/shared/actions/api/update/interactions'

export const handle_pick_api_model = async (
  provider: SettingsViewProvider,
  message: any
): Promise<void> => {
  const providers_manager = new ProvidersManager(provider.extension_context)
  const model_fetcher = new ModelFetcher()

  const model = await edit_model_for_api_configuration({
    api_configuration: {
      provider_name: message.provider_name,
      model: message.current_model
    } as any,
    providers_manager,
    model_fetcher
  })

  if (model) {
    provider.postMessage({
      command: 'NEWLY_PICKED_API_MODEL',
      model_id: model
    })
  }
}
