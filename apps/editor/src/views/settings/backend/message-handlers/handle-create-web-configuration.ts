import { CreateWebConfigurationMessage } from '@/views/settings/types/messages'
import { create } from '@/views/shared/actions/web/create'
import { SettingsProvider } from '../settings-provider'
import { config_web_configuration_to_ui_format } from '@/utils/web-configuration-format-converters'

export const handle_create_web_configuration = async (
  provider: SettingsProvider,
  message: CreateWebConfigurationMessage
): Promise<void> => {
  const result = await create({
    placement: message.create_on_top ? 'top' : 'bottom',
    reference_index: message.insertion_index
  })

  if (result) {
    provider.postMessage({
      command: 'START_WEB_CONFIGURATION_CREATION',
      web_configuration: config_web_configuration_to_ui_format(result.config),
      insertion_index: result.insertion_index
    })
  }
}
