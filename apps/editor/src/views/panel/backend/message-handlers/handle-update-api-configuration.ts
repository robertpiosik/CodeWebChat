import { PanelProvider } from '../panel-provider'
import { update } from '@/views/shared/actions/api/update/update'

export const handle_update_api_configuration = async (
  provider: PanelProvider,
  message: any
): Promise<void> => {
  const result = await update({
    context: provider.context,
    updating_api_configuration: message.updating_api_configuration,
    updated_api_configuration: message.updated_api_configuration,
    origin: message.origin,
    is_new: message.is_new,
    insertion_index: message.insertion_index,
    tool_type: message.tool_type
  })

  if (result.success) {
    provider.send_message({ command: 'API_CONFIGURATION_UPDATED' })

    if (message.is_new && message.origin === 'save' && result.new_id) {
      provider.send_message({
        command: 'SELECTED_API_CONFIGURATION_CHANGED',
        prompt_type: message.tool_type,
        id: result.new_id
      })
    }

    const { handle_get_api_configurations } =
      await import('./handle-get-api-configurations')
    await handle_get_api_configurations(provider)
  }
}
