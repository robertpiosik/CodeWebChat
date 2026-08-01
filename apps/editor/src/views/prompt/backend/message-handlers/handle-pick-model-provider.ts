import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { PickModelProviderMessage } from '@/views/prompt/types/messages'
import {
  edit_model_provider_for_api_configuration,
  edit_model_for_api_configuration
} from '@/views/shared/actions/api/update/interactions'
import { ModelProvidersManager } from '@/services/model-providers-manager'
import { ModelFetcher } from '@/services/model-fetcher'

export const handle_pick_model_provider = async (
  prompt_view_provider: PromptViewProvider,
  message: PickModelProviderMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(
    prompt_view_provider.extension_context
  )
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
      model_fetcher
    })

    if (new_model !== undefined) {
      prompt_view_provider.send_message({
        command: 'NEWLY_PICKED_MODEL_PROVIDER',
        model_provider_name: result.model_provider_name
      })
      prompt_view_provider.send_message({
        command: 'NEWLY_PICKED_API_MODEL',
        model_id: new_model
      })
    }
  }
}
