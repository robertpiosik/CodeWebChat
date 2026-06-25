import { config_web_configuration_to_ui_format } from '@/utils/web-configuration-format-converters'
import { PanelProvider } from '../panel-provider'
import { create_web_configuration } from '@/views/actions/create-web-configuration'

export const handle_create_web_configuration = async (
  provider: PanelProvider,
  message: any
): Promise<void> => {
  const result = await create_web_configuration({
    placement: message.placement,
    reference_index: message.reference_index
  })

  if (result) {
    provider.send_message({
      command: 'START_WEB_CONFIGURATION_CREATION',
      web_configuration: config_web_configuration_to_ui_format(result.config),
      insertion_index: result.insertion_index
    })
  }
}
