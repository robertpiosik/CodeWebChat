import { PromptViewProvider } from '../prompt-view-provider'
import { update } from '@/views/shared/actions/api/update/update'

export const handle_update_api_configuration = async (
  provider: PromptViewProvider,
  message: any
): Promise<void> => {
  const result = await update({
    extension_context: provider.extension_context,
    updating_api_configuration: message.updating_api_configuration,
    updated_api_configuration: message.updated_api_configuration,
    origin: message.origin,
    is_new: message.is_new,
    insertion_index: message.insertion_index,
    api_feature: message.api_feature
  })

  if (result.success) {
    provider.send_message({ command: 'API_CONFIGURATION_UPDATED' })

    if (message.is_new && message.origin === 'save' && result.new_id) {
      provider.send_message({
        command: 'SELECTED_API_CONFIGURATION_CHANGED',
        prompt_type: message.api_feature,
        id: result.new_id
      })
    }

    const { handle_get_api_configurations } =
      await import('./handle-get-api-configurations')
    await handle_get_api_configurations(provider)
  }
}
