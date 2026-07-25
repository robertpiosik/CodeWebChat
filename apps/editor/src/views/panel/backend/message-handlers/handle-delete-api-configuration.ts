import { PanelProvider } from '../panel-provider'
import { remove } from '@/views/shared/actions/api/delete'

export const handle_delete_api_configuration = async (
  provider: PanelProvider,
  message: any
): Promise<void> => {
  await remove({
    extension_context: provider.extension_context,
    api_configuration_id: message.api_configuration_id
  })
}
