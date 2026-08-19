import { CreateWebConfigurationMessage } from '@/views/settings/types/messages'
import { create } from '@/views/shared/actions/web/create'
import { SettingsViewProvider } from '../settings-view-provider'
import { config_web_configuration_to_ui_format } from '@/utils/web-configuration-format-converters'

export const handle_create_web_configuration = async (
  provider: SettingsViewProvider,
  message: CreateWebConfigurationMessage
): Promise<void> => {
  const result = await create({
    reference_index: message.insertion_index,
    exact_insertion: message.exact_insertion
  })

  if (result) {
    provider.postMessage({
      command: 'START_WEB_CONFIGURATION_CREATION',
      web_configuration: config_web_configuration_to_ui_format(result.config),
      insertion_index: result.insertion_index
    })
  }
}
