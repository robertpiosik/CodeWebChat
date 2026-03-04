import { PanelProvider } from '../panel-provider'
import { delete_configuration } from '@/views/utils/delete-configuration'

export const handle_delete_configuration = async (
  provider: PanelProvider,
  message: any
): Promise<void> => {
  await delete_configuration({
    context: provider.context,
    configuration_id: message.configuration_id,
    type: message.api_prompt_type
  })
}
